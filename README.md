# AI Assistant React App 🤖

A responsive AI Assistant built with React, Tailwind CSS, and powered by the Google Gemini API. This application allows users to ask questions, summarize text, and generate creative content, with all interactions and feedback stored persistently in Google Cloud Firestore.

---

## ✨ Features

* **Three Core AI Functions:**
    * **Answer Questions:** Get factual answers to your queries.
    * **Summarize Text:** Condense long articles or documents into key points.
    * **Generate Creative Content:** Get ideas for stories, poems, or other creative text.
* **Google Gemini API Integration:** Leverages `gemini-2.5-flash-preview-05-20` for fast and relevant AI responses.
* **Persistent Storage with Firestore:** All user interactions (prompts, AI responses) and feedback are saved and retrieved from Google Cloud Firestore.
* **Real-time History:** View a real-time log of your past interactions.
* **User Feedback Mechanism:** Provide feedback on AI responses to help refine future interactions.
* **Anonymous Authentication:** Users are automatically signed in anonymously using Firebase Authentication to enable personal data storage without needing explicit accounts.
* **Responsive UI:** Designed with Tailwind CSS to look great on desktops, tablets, and mobile devices.

---

## 🛠️ Technologies Used

* **Frontend:** React.js
* **Styling:** Tailwind CSS
* **AI Model:** Google Gemini API (`gemini-2.5-flash-preview-05-20`)
* **Backend as a Service (BaaS):** Google Firebase
    * **Database:** Cloud Firestore
    * **Authentication:** Firebase Authentication (Anonymous)
    * **Hosting:** Firebase Hosting

---

## 🚀 Getting Started (Local Development)

Follow these steps to get a local copy of the project up and running on your machine.

### Prerequisites

* **Node.js & npm:** [Download & Install Node.js](https://nodejs.org/) (npm is included).
* **Git:** [Download & Install Git](https://git-scm.com/downloads).
* **Google Account:** Required for Firebase and Gemini API access.

### 1. Clone the Repository

```bash
git clone [https://github.com/ParthoDutta28/ai-assistant-react.git](https://github.com/ParthoDutta28/ai-assistant-react.git)
cd ai-assistant-react
