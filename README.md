NBA Feud (name in progress)

Welcome! Currently we have a very rudimentary game, NBA Feud, which gives the players a chance to test their NBA knowledge. In this game, players can either select a historic NBA team (from 2000 and on), or be assigned one at random. They will then be placed on the game page, where they will see 10 rows that correspond to the selected team's top 10 scoring leaders by points-per-game (PPG), limited to those who played at least 15 games. Depending on the difficulty level, the user can see the players' games played (GP) and PPG, and on the higher difficulties, they will also be required to guess the leaders in the exact correct order. Each user gets 5 guesses before the game ends. Their score is then logged on a personal leaderboard which can be found on the home page.

Current known issues:
- The design is incredibly bare-bones at the moment. Functionality was prioritized over presentation, though the presentation will be addressed later.
- Teams such as the New Orleans Pelicans, Charlotte Hornets, and Oklahoma City Thunder all saw re-brands or location changes at some point since 2000. The names on the game page do not accurately reflect the team/name for the pre-rebrand years. The names presented are the ones currently used by the NBA. 
- There are some issues with page re-sizing on different browsers and window sizes. This will be addressed at a later date.
- At the moment there is no way to indicate what difficulty the high-scores were achieved on. I am debating whether to make a distinction in the score board, or to simply adjust the weight of the scoring.
- The scoring for correct guesses will be weighted based on how obscure the player is (how far down the list they are). I have not yet decided how I want to do this.
- At a later date, an auto-complete functionality may be added to reduce the chances of typos

The server is deployed on the free tier of Render, so there may be delays in responses.
The application itself is deployed on GitHub Pages at https://niravbarman.github.io/NBA-Feud