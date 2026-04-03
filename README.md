Finask ✨

Find Your Future. Share Your Story.

Finask is a comprehensive, student-focused platform designed to revolutionize the university selection process in Ethiopia. Inspired by real-world challenges, Finask aims to be a single, trusted ecosystem where students can explore universities, discover programs, and connect with a community of peers and mentors to make informed decisions about their future.

🚀 Current State & Implementation

Finask is currently functioning as a fully integrated full-stack application. The platform seamlessly connects a dynamic mobile frontend with a robust backend architecture to deliver a complete ecosystem for prospective university students.

The Vision

Choosing a university is one of the most significant decisions a person can make. In Ethiopia, access to clear, consolidated, and authentic information is a major challenge. Finask was born from this challenge.

Our mission is to empower students by providing them with:

A Centralized Hub: Bringing together detailed information about universities, campuses, programs, and even the cities they are in.

Authentic Insights: Moving beyond marketing brochures by providing a platform for real students to share their "Real Stories" through reviews and a community Q&A.

Inspiration & Guidance: Connecting students with the stories of "Great Minds" to inspire them on their own academic journeys.

🌟 Core Features (Current MVP)

Finask is more than just a search engine; it's a complete ecosystem. Our current live features include:

🎓 University Profiles: In-depth pages for each university, covering details, rankings, photos, and more.

📚 Program Discovery: A comprehensive guide to academic programs, helping students find the right fit for their interests.

⭐ Reviews & Ratings: "Real Stories" allowing current students and alumni to leave authentic feedback.

❤️ Personalized Wishlist: Allowing users to save and compare their top university choices.

Future roadmap includes: Community Q&A, City & Campus Guides, and Great Minds profiles.

💻 Tech Stack

Frontend: Flutter

Backend: Node.js, Express.js

Database: MongoDB with Mongoose

Authentication: JSON Web Tokens (JWT)

🏁 Getting Started

To get a local copy up and running to evaluate the codebase, please follow these simple steps.

Prerequisites

Node.js (v18.x or later)

MongoDB (local instance or a free Atlas cluster)

Flutter SDK (for running the frontend)

Installation

Clone the repository:

git clone [https://github.com/your_username/finask-backend.git](https://github.com/your_username/finask-backend.git)


Navigate into the directory and install dependencies:

cd finask-backend
npm install


Set up your environment variables by creating a .env file in the root directory:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key


Start the server:

npm start
