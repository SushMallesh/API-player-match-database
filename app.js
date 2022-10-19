const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3001, () => {
      console.log("Server is running at http://localhost:3001");
    });
  } catch (err) {
    console.log(`DB Error: ${err.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//db conversion to response

const convertPlayerDetailsTable = (playerObject) => {
  return {
    playerId: playerObject.player_id,
    playerName: playerObject.player_name,
  };
};
const convertMatchDetailsTable = (matchObject) => {
  return {
    matchId: matchObject.match_id,
    match: matchObject.match,
    year: matchObject.year,
  };
};
const convertScoreTable = (scoreOb) => {
  return {
    playerMatchId: scoreOb.player_match_id,
    playerId: scoreOb.player_id,
    matchId: scoreOb.match_id,
    score: scoreOb.score,
    fours: scoreOb.fours,
    sixes: scoreOb.sixes,
  };
};
// API to get list of all players
app.get("/players/", async (request, response) => {
  const getPlayerListQuery = `
    SELECT * FROM player_details;`;
  const playersList = await database.all(getPlayerListQuery);
  response.send(
    playersList.map((eachPlayer) => convertPlayerDetailsTable(eachPlayer))
  );
});

// API to get specific player based on the player ID

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT * 
    FROM player_details
    WHERE player_id = ${playerId};`;
  const player = await database.get(getPlayerQuery);
  response.send(convertPlayerDetailsTable(player));
});

// API to update a specific player based on the player ID

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const getUpdateQuery = `
    UPDATE player_details 
    SET player_name = '${playerName}'
    WHERE player_id = ${playerId};`;
  await database.run(getUpdateQuery);
  response.send("Player Details Updated");
});

// API to get match details of a specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
    SELECT *
    FROM match_details
    WHERE match_id = ${matchId};
    `;
  const match = await database.get(getMatchQuery);
  response.send(convertMatchDetailsTable(match));
});

// API to get  list of all the matches of a player

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
    SELECT match_details.match_id,match,year
    FROM match_details INNER JOIN player_match_score ON 
    match_details.match_id = player_match_score.match_id 
    WHERE player_match_score.player_id = ${playerId}`;
  const playerMatches = await database.all(getPlayerMatchesQuery);
  response.send(
    playerMatches.map((matches) => convertMatchDetailsTable(matches))
  );
});

// API to get list of players of a specific match

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
    SELECT player_details.player_id,player_name
    FROM player_match_score INNER JOIN player_details ON 
    player_details.player_id = player_match_score.player_id
    WHERE match_id = ${matchId};`;
  const matchPlayers = await database.all(getMatchPlayersQuery);
  response.send(
    matchPlayers.map((eachPlayer) => convertPlayerDetailsTable(eachPlayer))
  );
});

// API to get statistics of the total score, fours, sixes of a specific player
app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getScoresQuery = `
    SELECT player_details.player_id,player_name,
    SUM(score),SUM(fours),SUM(sixes)
    FROM player_details INNER JOIN player_match_score ON 
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`;
  const stats = await database.get(getScoresQuery);
  response.send({
    playerId: stats.player_id,
    playerName: stats.player_name,
    totalScore: stats["SUM(score)"],
    totalFours: stats["SUM(fours)"],
    totalSixes: stats["SUM(sixes)"],
  });
});

module.exports = app;
