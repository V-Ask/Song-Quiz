# Song Quiz

A themed song voting platform where users can submit songs, vote on them, and see the results.

## Features

- **Phase 0 (Admin)**: Create a flow with a custom song theme
- **Phase 1 (Submission)**: Users submit songs with links to Spotify, YouTube, or SoundCloud
- **Phase 2 (Voting)**: Users vote on songs (3 points, 2 points, 1 point) - submitters are hidden
- **Phase 3 (Results)**: Display rankings with submitter names revealed

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server will run on http://localhost:3000

## Usage

### Admin Panel
1. Access the admin panel at http://localhost:3000/admin
2. Login with the default password: `admin123`
3. Create a new flow by entering a theme (e.g., "Summer Vibes", "90s Classics")
4. Optionally set a timer for automatic phase progression
5. Manually advance through phases using the phase control buttons

### User Flow
1. Visit http://localhost:3000
2. Wait for admin to start Phase 1 (Submissions)
3. Submit your song with:
   - Your name
   - Song title
   - Artist name
   - Link to Spotify, YouTube, or SoundCloud
4. When Phase 2 (Voting) starts, assign your votes:
   - 3 points to your favorite song
   - 2 points to your second favorite
   - 1 point to your third favorite
5. View results in Phase 3

## Security Features

- Cookie-based user identification
- Users can only submit one song per flow
- Users can only vote once per flow
- Users cannot vote for their own song
- Admin authentication required for phase control

## Customization

To change the admin password, set the `ADMIN_PASSWORD` environment variable:

```bash
ADMIN_PASSWORD=your_password npm start
```

## Project Structure

```
song-quiz/
├── server.js          # Main server file
├── database.js        # Database queries and setup
├── middleware/
│   └── auth.js        # Authentication middleware
├── routes/
│   ├── admin.js       # Admin routes
│   ├── songs.js       # Song submission routes
│   └── votes.js       # Voting routes
└── public/
    ├── index.html     # User interface
    ├── admin.html     # Admin dashboard
    ├── app.js         # User interface logic
    ├── admin.js       # Admin dashboard logic
    └── styles.css     # Styling
```

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Frontend**: Vanilla JavaScript + HTML + CSS
- **Authentication**: Cookie-based sessions
