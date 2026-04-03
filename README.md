# Finask ✨

**Find Your Future. Share Your Story.**

---

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Status: Active Development](https://img.shields.io/badge/status-active%20development-brightgreen)
![Built with: Love](https://img.shields.io/badge/built%20with-love-ff69b4)

**Finask** is a comprehensive, student-focused platform designed to revolutionize the university selection process in Ethiopia. Inspired by real-world challenges, Finask aims to be a single, trusted ecosystem where students can explore universities, discover programs, and connect with a community of peers and mentors to make informed decisions about their future.

This repository contains the source code for the **Finask Backend**, built with Node.js, Express, and MongoDB.

## The Vision

Choosing a university is one of the most significant decisions a person can make. In Ethiopia, access to clear, consolidated, and authentic information is a major challenge. Finask was born from this challenge.

Our mission is to empower students by providing them with:

- **A Centralized Hub:** Bringing together detailed information about universities, campuses, programs, and even the cities they are in.
- **Authentic Insights:** Moving beyond marketing brochures by providing a platform for real students to share their "Real Stories" through reviews and a community Q&A.
- **Inspiration & Guidance:** Connecting students with the stories of "Great Minds" to inspire them on their own academic journeys.

## Core Features

Finask is more than just a search engine; it's a complete ecosystem.

- **🎓 University Profiles:** In-depth pages for each university, covering details, rankings, photos, and more.
- **📚 Program Discovery:** A comprehensive guide to academic programs, helping students find the right fit for their interests.
- **🏙️ City & Campus Guides:** Detailed information about the environment where students will live and learn.
- **⭐ Reviews & Ratings:** "Real Stories" from current students and alumni, providing a human touch to the data.
- **❓ Community Q&A:** A space for prospective students to ask questions and get answers from the wider community.
- **💡 Great Minds:** Inspirational profiles of professionals and scientists to motivate students.
- **❤️ Personalized Wishlist:** Allowing users to save and compare their top university choices.

## Tech Stack

This platform is built using a modern, robust, and scalable technology stack:

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens (JWT)
- **Frontend:** Flutter (in a separate repository)

## Project Status

**Active Development.** We have successfully laid the foundational infrastructure and are now in the process of building out the core API endpoints for our Minimum Viable Product (MVP).

## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

- Node.js (v18.x or later)
- MongoDB (local instance or a free Atlas cluster)

### Installation

1.  Clone the repo
    ```sh
    git clone [https://github.com/your_username/finask-backend.git](https://github.com/your_username/finask-backend.git)
    ```
2.  Navigate into the project directory
    ```sh
    cd finask-backend
    ```
3.  Install NPM packages
    ```sh
    npm install
    ```
4.  Create a `config.env` file in the root directory and add your environment variables:
    ```env
    DATABASE_URL=<YOUR_MONGODB_CONNECTION_STRING>
    DATABASE_PASSWORD=<YOUR_MONGODB_PASSWORD>
    JWT_SECRET=<YOUR_JWT_SECRET>
    ```
5.  Start the server
    ```sh
    npm start
    ```

## The Roadmap

Our development is phased to ensure stability and quality.

1.  **Phase 1: MVP (In Progress)**
    - User Authentication
    - University & Program Search/View
    - Wishlist Functionality
2.  **Phase 2: Full-Featured Launch**
    - Community Features (Reviews, Q&A)
    - City, Campus & Great Minds Content
    - In-App Notifications

## The Architect

This project was envisioned, designed, and is being built by **Ephrem Ketachew**.

---

_This README was last updated on July 24, 2025._
