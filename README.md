# Finask API

Finask API is the backend for a student-focused university guidance platform built to help learners in Ethiopia discover universities, explore programs, and make better academic decisions.

## Overview

This service powers the core data, authentication, content, and recommendation features behind Finask. It provides a structured API for university profiles, programs, reviews, favorites, search, and supporting content management.

## Key Features

- University, campus, city, and program management
- User authentication and account security with JWT
- Reviews, replies, favorites, and interaction tracking
- Search and comparison endpoints for discovery workflows
- Image and content handling with cloud storage support
- Seed scripts for sample data, migrations, and maintenance tasks

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Cloudinary, Multer, Sharp, and Nodemailer

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB connection string

### Installation

```bash
git clone https://github.com/ephrem-ketachew/finask.git
cd finask-backend
npm install
```

### Environment Variables

Create a `config.env` file in the project root and define the required values, such as:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### Run the Server

```bash
npm start
```

For development:

```bash
npm run dev
```

## Available Scripts

- `npm start` - start the API
- `npm run dev` - run the server with nodemon
- `npm run debug` - start the server with the Node.js inspector
- `npm run seed:import` - import seed data
- `npm run seed:delete` - remove seed data
- `npm run seed:content` - seed content data

## Project Structure

- `controllers/` - request handlers and business logic
- `models/` - Mongoose schemas and models
- `routes/` - API route definitions
- `services/` - reusable service-layer logic
- `middleware/` - authentication, upload, and error handling
- `utils/` - shared helpers and utilities
- `seeds/` - scripts for populating and maintaining data

## Purpose

Finask is designed to make university discovery more transparent, practical, and student-centered by combining structured information with real community feedback.

## License

ISC
