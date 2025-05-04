# Work Hours Tracker

A full-stack Node.js application for tracking work hours with user authentication.

## Features

- User registration and login
- Calendar interface for selecting dates
- Track work hours with start/end times and breaks
- View work hours by date range
- Statistics on weekly and pay period hours
- Payperiod tracking
- Overnight shift support
- Responsive design

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: Passport.js
- **View Engine**: EJS
- **Frontend**: JavaScript, CSS, HTML

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or newer)
- MongoDB (local or Atlas)

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd work-hours-tracker
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory with the following variables:

```
MONGO_URI=mongodb://localhost:27017/time-tracker
SESSION_SECRET=your-very-secure-session-secret
PORT=3000
```

Replace `your-very-secure-session-secret` with a strong random string.
For production, use a MongoDB Atlas connection string instead of the local MongoDB URL.

4. **Start the application**

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

5. **Access the application**

Open your browser and navigate to `http://localhost:3000`

## Deployment Options

### Option 1: Deploying to Heroku

1. Create a Heroku account and install the Heroku CLI
2. Login to Heroku CLI: `heroku login`
3. Create a new Heroku app: `heroku create your-app-name`
4. Add MongoDB add-on: `heroku addons:create mongodb:sandbox`
5. Set environment variables:
   ```bash
   heroku config:set SESSION_SECRET=your-very-secure-session-secret
   ```
6. Push to Heroku: `git push heroku main`

### Option 2: Deploying to a VPS (DigitalOcean, AWS, etc.)

1. Provision a server (Ubuntu recommended)
2. Install Node.js, npm, and MongoDB
3. Clone repository to the server
4. Set up environment variables
5. Install PM2 for process management: `npm install -g pm2`
6. Start the application: `pm2 start server.js`
7. Set up Nginx as a reverse proxy
8. Configure SSL with Let's Encrypt

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. 