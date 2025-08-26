import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

// Shadcn UI components (simulated for clarity, actual implementation would use their components)
const Select = ({ value, onChange, children }) => (
  <select className="p-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" value={value} onChange={onChange}>
    {children}
  </select>
);
const SelectItem = ({ value, children }) => (
  <option value={value}>{children}</option>
);
const Button = ({ onClick, children, className = "", disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'} ${className}`}
  >
    {children}
  </button>
);
const Input = ({ value, onChange, placeholder, className = "" }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${className}`}
  />
);
const Textarea = ({ value, onChange, placeholder, className = "" }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows="5"
    className={`flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-y ${className}`}
  />
);
const Card = ({ children, className = "" }) => (
  <div className={`bg-white p-6 rounded-lg shadow-xl border border-gray-200 ${className}`}>
    {children}
  </div>
);
const Spinner = () => (
  <div className="flex justify-center items-center py-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Exponential backoff utility for API calls
const makeApiCallWithBackoff = async (apiCall, retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i < retries - 1 && error.message.includes('Resource exhausted')) { // Common error for rate limits
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
  throw new Error('API call failed after multiple retries.');
};

export default function App() {
  const [selectedFunction, setSelectedFunction] = useState('answer');
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null); // 'yes', 'no', or null
  const [chatHistory, setChatHistory] = useState([]); // Stores past interactions
  const [userId, setUserId] = useState(null);
  const [appInitialized, setAppInitialized] = useState(false);

  // Firebase references
  const dbRef = useRef(null);
  const authRef = useRef(null);
  const appRef = useRef(null);

  // Initialize Firebase and handle authentication
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // >>> START MODIFICATION FOR LOCAL RUNNING - YOUR PROVIDED CONFIG IS HERE <<<
        const YOUR_ACTUAL_FIREBASE_CONFIG = {
          apiKey: "AIzaSyARwbynX_H3QyL6Sr4RmuZul6zb54RfNoQ",
          authDomain: "ai-assistant-69269.firebaseapp.com",
          projectId: "ai-assistant-69269",
          storageBucket: "ai-assistant-69269.firebasestorage.app",
          messagingSenderId: "408226894080",
          appId: "1:408226894080:web:c767927f849008c1a423e5",
          measurementId: "G-8PBX1R3N74"
        };
        const YOUR_ACTUAL_APP_ID = YOUR_ACTUAL_FIREBASE_CONFIG.appId; // Extract appId from your config

        // Use your actual config for initialization
        if (!appRef.current) {
          appRef.current = initializeApp(YOUR_ACTUAL_FIREBASE_CONFIG);
          dbRef.current = getFirestore(appRef.current);
          authRef.current = getAuth(appRef.current);
        }

        // For local development, we sign in anonymously
        await signInAnonymously(authRef.current);

        // >>> END MODIFICATION FOR LOCAL RUNNING <<<

        onAuthStateChanged(authRef.current, (user) => {
          if (user) {
            setUserId(user.uid);
            setAppInitialized(true);
          } else {
            setUserId(null);
            setAppInitialized(true);
          }
        });

      } catch (err) {
        console.error("Firebase initialization or authentication error:", err);
        setError("Failed to initialize the app. Please try again.");
      }
    };

    initializeFirebase();
  }, []);

  // Fetch chat history from Firestore
  useEffect(() => {
    if (!dbRef.current || !userId) return;

    // Use the determined appId for the Firestore collection path
    const currentAppId = "1:408226894080:web:c767927f849008c1a423e5"; // Your actual appId from the config
    const interactionsCollectionRef = collection(dbRef.current, `artifacts/${currentAppId}/users/${userId}/assistant_interactions`);
    const q = query(interactionsCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatHistory(history);
    }, (err) => {
      console.error("Error fetching chat history:", err);
      setError("Failed to load chat history.");
    });

    return () => unsubscribe();
  }, [userId]); // Re-run when userId is available

  const handleQuerySubmit = useCallback(async () => {
    if (!userInput.trim()) {
      setError("Please enter your query.");
      return;
    }
    setLoading(true);
    setResponse('');
    setError('');
    setFeedback(null); // Reset feedback for new interaction

    let prompt = '';
    let interactionType = '';

    // Craft prompts based on selected function
    switch (selectedFunction) {
      case 'answer':
        prompt = `Answer the following question: "${userInput}"`;
        interactionType = 'Question Answer';
        break;
      case 'summarize':
        prompt = `Summarize the following text: "${userInput}"`;
        interactionType = 'Text Summary';
        break;
      case 'generate':
        prompt = `Generate creative content based on this request: "${userInput}"`;
        interactionType = 'Creative Content Generation';
        break;
      default:
        prompt = userInput;
        interactionType = 'General Query';
    }

    try {
      const apiKey = "AIzaSyCFoq0ZOmUqdcBJg_kfUfoKYnplwGxJZIU"; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      };

      const apiCall = async () => {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`API Error: ${res.status} - ${errorData.error.message || res.statusText}`);
        }
        return res.json();
      };

      const result = await makeApiCallWithBackoff(apiCall);

      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        const aiResponse = result.candidates[0].content.parts[0].text;
        setResponse(aiResponse);

        // Store interaction in Firestore
        if (dbRef.current && userId) {
          const currentAppId = "1:408226894080:web:c767927f849008c1a423e5"; // Your actual appId from the config
          await addDoc(collection(dbRef.current, `artifacts/${currentAppId}/users/${userId}/assistant_interactions`), {
            prompt: userInput,
            aiResponse: aiResponse,
            function: selectedFunction,
            timestamp: serverTimestamp(),
            feedback: null // Initialize with null feedback
          });
        }
      } else {
        setError("No valid response from AI. Please try again with a different prompt.");
      }
    } catch (err) {
      console.error("Error during AI API call:", err);
      setError(`Failed to get a response: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [userInput, selectedFunction, userId]);

  const handleFeedback = useCallback(async (isHelpful) => {
    if (!dbRef.current || !userId || chatHistory.length === 0) return;

    setFeedback(isHelpful ? 'yes' : 'no');

    // Update the last interaction with feedback by adding a new feedback record.
    try {
      const currentAppId = "1:408226894080:web:c767927f849008c1a423e5"; // Your actual appId from the config
      await addDoc(collection(dbRef.current, `artifacts/${currentAppId}/users/${userId}/assistant_interactions`), {
        type: "feedback", // Indicate this is a feedback entry
        forInteractionId: chatHistory[0].id, // Link to the most recent interaction
        feedbackValue: isHelpful,
        timestamp: serverTimestamp()
      });
      console.log("Feedback saved successfully!");
    } catch (err) {
      console.error("Error saving feedback:", err);
      setError("Failed to save feedback.");
    }
  }, [userId, chatHistory]);

  const renderInputField = () => {
    switch (selectedFunction) {
      case 'answer':
        return (
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="e.g., What is the capital of France?"
          />
        );
      case 'summarize':
        return (
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Paste text here to summarize..."
          />
        );
      case 'generate':
        return (
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="e.g., Write a short story about a dragon and a princess"
          />
        );
      default:
        return null;
    }
  };

  if (!appInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Spinner />
        <p className="ml-3 text-lg text-gray-700">Initializing app...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 font-sans text-gray-800">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <Card className="text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <h1 className="text-4xl font-extrabold mb-2 leading-tight">AI Assistant</h1>
          <p className="text-lg opacity-90">Your intelligent companion for questions, summaries, and creative ideas.</p>
          {userId && (
            <p className="text-sm mt-2 opacity-80">User ID: {userId}</p>
          )}
        </Card>

        {/* Main Interaction Area */}
        <Card>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <label htmlFor="function-select" className="text-lg font-semibold whitespace-nowrap">Choose Function:</label>
            <Select
              id="function-select"
              value={selectedFunction}
              onChange={(e) => {
                setSelectedFunction(e.target.value);
                setUserInput(''); // Clear input on function change
                setResponse('');
                setError('');
                setFeedback(null);
              }}
              className="flex-grow"
            >
              <SelectItem value="answer">Answer Questions</SelectItem>
              <SelectItem value="summarize">Summarize Text</SelectItem>
              <SelectItem value="generate">Generate Creative Content</SelectItem>
            </Select>
          </div>

          <div className="flex items-center gap-4 mb-6">
            {renderInputField()}
            <Button onClick={handleQuerySubmit} disabled={loading || !userInput.trim()}>
              {loading ? 'Processing...' : 'Submit'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">
              <p className="font-bold">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading && <Spinner />}

          {response && (
            <Card className="mt-6 bg-blue-50 bg-opacity-80 border-blue-200">
              <h3 className="text-xl font-semibold mb-3 text-blue-800">AI Response:</h3>
              <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{response}</p>

              {/* Feedback Mechanism */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center gap-3">
                <p className="font-semibold text-lg mr-2">Was this helpful?</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleFeedback(true)}
                    disabled={feedback === 'yes'}
                    className={`bg-green-600 hover:bg-green-700 ${feedback === 'yes' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    Yes
                  </Button>
                  <Button
                    onClick={() => handleFeedback(false)}
                    disabled={feedback === 'no'}
                    className={`bg-red-600 hover:bg-red-700 ${feedback === 'no' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    No
                  </Button>
                </div>
                {feedback && (
                  <span className="ml-4 text-sm text-gray-600">
                    Thanks for your feedback! {feedback === 'yes' ? '👍' : '👎'}
                  </span>
                )}
              </div>
            </Card>
          )}
        </Card>

        {/* Recent Interactions History */}
        {chatHistory.length > 0 && (
          <Card className="mt-8 bg-gray-50 border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">Recent Interactions</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {chatHistory
                .filter(entry => entry.type !== 'feedback') // Filter out explicit feedback entries for main display
                .map((entry, index) => (
                <div key={entry.id || index} className="p-4 bg-white border border-gray-100 rounded-md shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">
                    {entry.timestamp?.toDate ? entry.timestamp.toDate().toLocaleString() : 'Loading Date...'}
                  </p>
                  <p className="font-semibold text-blue-700 mb-1">Function: {entry.function}</p>
                  <p className="font-medium text-gray-800">User Prompt: "{entry.prompt}"</p>
                  <p className="text-gray-700 mt-2 whitespace-pre-wrap">AI Response: {entry.aiResponse}</p>
                  {/* Display feedback if available for this specific interaction */}
                  {entry.feedbackValue !== undefined && ( // Check for feedbackValue to display
                    <p className="text-sm text-gray-600 mt-2">Feedback: {entry.feedbackValue ? 'Helpful 👍' : 'Not helpful 👎'}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
