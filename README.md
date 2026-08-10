# NBA Feud (name in progress)

## AI USE DISCLAIMER

In creating this project, I used AI tools for assistance - primarily Claude Sonnet 4.5, with some use of ChatGPT 5 for cleanup at the end. Here are the ways I used them, and if relevant, the prompts I used:

- Pre-Development Initialization: "I am creating a full-stack web application using TypeScript, Node.js, React, HTML, and CSS. I will be accessing various APIs within this project. Provide me with the setup steps to initialize the project." This prompt gave me a list of what dependencies to install, and guided me through the Vite React+TS project setup steps.
- API Selection: "I am looking for an API that gives me access to NBA rosters and their stats for specific years. Scrape the internet and provide me with any options that are free and robust." Using the results from this prompt, I narrowed down my options, and made my own assessment for which API to ultimately use for this project.
- Code Snippets: At various points, I had ideas for functions I wanted to implement, but knew would be tedious. I had my agent generate code snippets for these, and I subsequently cleaned them up to fit within my existing code.
- Debugging: At various points if I was having build or web page issues, I would copy my code file along with the error, and have the agent guide me through debugging.
- Code Cleanup: "This is the link to my GitHub Repo: [link]. Comb through the files and flag any unused, irrelevant, or unnecessary files, code snippets, and comments." Using the results of this prompt, I combed through the code and updated/removed anything that was no longer needed.
- README Creation: I wrote the inital README on my own, and then 

## About

Welcome! Currently we have a very rudimentary game, NBA Feud, which gives the players a chance to test their NBA knowledge. In this game, players can either select a historic NBA team (from 2000 and on), or be assigned one at random. They will then be placed on the game page, where they will see 10 rows that correspond to the selected team's top 10 scoring leaders by points-per-game (PPG), limited to those who played at least 15 games.

Depending on the difficulty level, the user can see the players' games played (GP) and PPG, and on the higher difficulties, they will also be required to guess the leaders in the exact correct order. Each user gets 5 guesses before the game ends. Their score is then logged on a personal leaderboard which can be found on the home page.

This is currently a far from finished product. Please refer to the Known Issues and Future Improvements sections later in the readme for a better idea of current and future development plans. Thank you for your understanding.

## How to Play

1. Select an NBA team and season, or choose a random team/season.
2. Select a difficulty level.
3. Start the game.
4. Try to identify the 10 players who led the selected team in PPG for that season.
5. You have five incorrect guesses available before the game ends.
6. Depending on the difficulty, either guess the players in any order or identify them from highest to lowest PPG.
7. Your score is recorded when the game ends and can be viewed on the home page.

The game accepts player names without requiring an exact match in capitalization or accents. Guesses are normalized before being compared with the answers.

## Difficulty Levels

There are currently four difficulty levels:

| Difficulty | Guess Order | GP / PPG Shown |
| --- | --- | --- |
| Easy | Any order | Yes |
| Medium | Any order | No |
| Hard | Highest to lowest PPG | Yes |
| Impossible | Highest to lowest PPG | No |

The harder modes therefore require both more NBA knowledge and more attention to the information available on the board.

## Seasons and Teams

The game supports NBA seasons beginning in 2000 and generates the available season list dynamically based on the current date.

Players are selected from the requested team's regular-season data, with a minimum-games filter applied before the leaderboard is sorted. By default, the server requests the top 10 players with at least 15 games played.

The available team list is maintained by the application and includes the historical NBA teams represented in the game. Because franchise names have changed over time, the application currently displays the team's present-day name even when playing a season from before a rebrand or relocation.

## Scoring and Leaderboard

Correctly identifying a player currently awards 10 points.

Scores are stored in Firebase Firestore under the authenticated user's account. The application tracks both the score from a user's first attempt for a particular team/season and their highest score for that same game configuration, along with the number of attempts.

The home page displays the user's scoreboard and updates it using a live Firestore listener.

Scoring is currently intentionally simple. A planned future change is to give more points for correctly identifying players who are further down the PPG leaderboard.

## Architecture

NBA Feud is a full-stack web application consisting of a React frontend and an Express backend.

### Frontend

The frontend is built with:

- React
- TypeScript
- Vite
- React Router
- Firebase Authentication
- Firebase Firestore

The frontend is responsible for the game interface, team and season selection, difficulty settings, game state, player guesses, scoring, and the personal scoreboard.

Game configuration is stored in a short-lived, session-bound ticket. Only a token is placed in the game URL, while the ticket itself is stored in the browser's session storage.

### Backend

The backend is built with:

- Node.js
- Express
- TypeScript
- CORS

The backend exposes an API for retrieving team scoring data. It communicates with NBA Stats and normalizes the returned player information before filtering and sorting it.

The `/api/team-ppg` endpoint:

- Accepts a team, season, and season type.
- Applies configurable limits for the number of players returned.
- Applies a minimum-games-played requirement.
- Normalizes games played and PPG fields.
- Sorts players primarily by PPG and then by games played.
- Returns the requested number of players.

The server caches the complete team/season PPG result for 24 hours. Individual requests can then apply their own limit and minimum-games-played filters without repeatedly querying NBA Stats.

A health endpoint is also available at `/api/health`.

## Data Flow

A typical game follows this general flow:

```text
User
  |
  v
React / Vite frontend
  |
  | Select team, season, difficulty
  v
Session-bound game ticket
  |
  v
Express API
  |
  v
NBA Stats
  |
  v
24-hour server cache
  |
  v
Normalized / filtered / sorted player data
  |
  v
Game board
  |
  v
Player guesses and score
  |
  v
Firebase Firestore
  |
  v
Personal scoreboard

This separation keeps the NBA data retrieval and normalization on the server while leaving game interaction and presentation to the frontend.

## Local Development

The repository contains both the frontend and backend applications.

Install the dependencies for both applications from the repository root:

```bash
npm run install:all
```

Start the frontend and backend together in development mode:

```bash
npm run dev
```

Build both applications:

```bash
npm run build
```

The frontend uses Vite's development server, while the backend runs through `tsx` during development.

### Environment Variables

A `.env.example` file is included in the repository with the environment variables required by the frontend:

```text
VITE_FIREBASE_API_KEY=YOUR_PUBLIC_WEB_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_API_BASE=your-server-base
```

Create the appropriate environment file for local development and provide the Firebase project configuration and backend API base URL.

## Deployment

The application is deployed as two separate pieces.

The frontend is deployed on GitHub Pages:

https://niravbarman.github.io/NBA-Feud

The backend is deployed on Render.

The server is deployed on the free tier of Render, so there may be delays in responses.

The production backend restricts CORS to the configured frontend origins, while development mode permits requests from any origin for local testing.

## Current Known Issues

Current known issues:
- The design is incredibly bare-bones at the moment. Functionality was prioritized over presentation, though the presentation will be addressed later.
- Teams such as the New Orleans Pelicans, Charlotte Hornets, and Oklahoma City Thunder all saw re-brands or location changes at some point since 2000. The names on the game page do not accurately reflect the team/name for the pre-rebrand years. The names presented are the ones currently used by the NBA.
- There are some issues with page re-sizing on different browsers and window sizes. This will be addressed at a later date.
- At the moment there is no way to indicate what difficulty the high-scores were achieved on. I am debating whether to make a distinction in the score board, or to simply adjust the weight of the scoring.
- The scoring for correct guesses will be weighted based on how obscure the player is (how far down the list they are). I have not yet decided how I want to do this.
- At a later date, an auto-complete functionality may be added to reduce the chances of typos

## Deployment Notes

The server is deployed on the free tier of Render, so there may be delays in responses.
The application itself is deployed on GitHub Pages at https://niravbarman.github.io/NBA-Feud

## Repository Structure

```text
NBA-Feud/
├── .github/
│   └── workflows/
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── lib/
│       ├── pages/
│       ├── api.ts
│       ├── session.ts
│       ├── teams.ts
│       └── App.tsx
├── server/
│   └── src/
│       ├── services/
│       ├── cache.ts
│       └── index.ts
├── .env.example
├── package.json
└── README.md
```

The `client` directory contains the browser application and game interface. The `server` directory contains the API and NBA Stats integration. Firebase-related functionality is kept in the frontend because authentication and the user's personal scoreboard are handled through Firebase.

## API

### `GET /api/health`

Returns a simple health check response:

```json
{
  "ok": true
}
```

### `GET /api/team-ppg`

Retrieves scoring information for a team and season.

Parameters include:

| Parameter | Description | Default |
| --- | --- | --- |
| `team_id` | NBA team ID | Required |
| `season` | NBA season | `2015-16` |
| `season_type` | Season type | `Regular Season` |
| `limit` | Maximum number of players | `10` |
| `min_games` | Minimum games played | `15` |

The endpoint returns normalized player information along with the season, season type, team ID, requested limit, and minimum-games filter.

The server also maintains `/api/team_ppg` as a legacy alias that redirects requests to `/api/team-ppg`.

## Data Source

NBA player and team statistics are retrieved through NBA Stats. The server is responsible for requesting the data, normalizing the fields returned by the API, calculating PPG when necessary, filtering players by games played, and sorting the resulting leaderboard.

Because NBA Stats is an external service, response times and availability can vary. The server-side 24-hour cache is used to reduce repeated requests for the same team and season.

## Future Improvements

The following ideas are already reflected in the project's current known issues and planned functionality:

- Improve the visual design.
- Improve responsive behavior across browsers and window sizes.
- Correctly represent historical franchise names and locations.
- Distinguish leaderboard scores by difficulty.
- Introduce scoring based on player obscurity.
- Add player-name autocomplete to reduce spelling-related mistakes.
- Possible changes to difficulty levels or modifiers (hints, more lives, retries, etc.)

The project is still evolving, and additional gameplay and presentation improvements may be added as development continues.