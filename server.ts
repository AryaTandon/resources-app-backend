import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

const SQLQuery = "SELECT res.id, res.title, res.author, res.url, " +
"res.description, rtg.cat_tags, rt.content_type, rec.recommender, rec.is_faculty, " +
"rec.mark_stage, rec.was_used, rv.vote FROM resources res " +
"LEFT JOIN resource_type rt ON res.id = rt.id " +
"LEFT JOIN resource_tags rtg ON res.id = rtg.id " +
"LEFT JOIN recommendations rec ON res.id = rec.id " +
"LEFT JOIN resource_votes rv ON res.id = rv.id ";

app.get("/", async (req, res) => {
  const dbres = await client.query(SQLQuery +
  "ORDER BY rv.id DESC;");
  res.json(dbres.rows);
});

app.get("/search/:search_term", async (req, res) => {
  const searchTerm = req.params.search_term
  const dbres = await client.query(SQLQuery +
  "WHERE res.title ILIKE '%'||$1||'%' OR " +
  "res.author ILIKE '%'||$1||'%' OR " +
  "res.description ILIKE '%'||$1||'%' OR " +
  "rtg.cat_tags ILIKE '%'||$1||'%';", [searchTerm]);
  res.json(dbres.rows);
});

app.get("/cat_tags/:search_term", async (req, res) => {
  const searchTerm = req.params.search_term;
  const dbres = await client.query(SQLQuery +
  "WHERE rtg.cat_tags ILIKE '%'||$1||'%';", [searchTerm]);
  res.json(dbres.rows);
});

app.post("/upvote/:id", async (req, res) => {
  const resourceID = parseInt(req.params.id);
  let dbres;
  try {
    let currentVoteCount: any = await client.query('SELECT vote FROM resource_votes ' +
    'WHERE id = $1;', [resourceID]);
    dbres = await client.query('UPDATE resource_votes SET vote = ($2 + 1) ' +
    'WHERE id = $1 RETURNING *;', [resourceID, currentVoteCount.rows[0].vote]);
  } catch (err) {
    dbres = await client.query('INSERT INTO resource_votes (id, vote) ' +
    'VALUES ($1, 1) RETURNING *;', [resourceID]);
  } finally {
    res.json(dbres.rows);
  }
});

app.post("/downvote/:id", async (req, res) => {
  const resourceID = parseInt(req.params.id);
  let dbres;
  try {
    let currentVoteCount: any = await client.query('SELECT vote FROM resource_votes ' +
    'WHERE id = $1;', [resourceID]);
    dbres = await client.query('UPDATE resource_votes SET vote = ($2 - 1) ' +
    'WHERE id = $1 RETURNING *;', [resourceID, currentVoteCount.rows[0].vote]);
  } catch (err) {
    dbres = await client.query('INSERT INTO resource_votes (id, vote) ' +
    'VALUES ($1, -1) RETURNING *;', [resourceID]);
  } finally {
    res.json(dbres.rows);
  }
});

app.post("/", async (req, res) => {
  try {
    const {title, author, url, description, recommender, is_faculty, was_used, mark_stage, cat_tags, content_type} = req.body
    await client.query("BEGIN");

    const dbres = await client.query('INSERT INTO resources (title, author, url, description) ' +
    'VALUES ($1, $2, $3, $4) RETURNING id;', [title, author, url, description]);

    // id.rows: [ {id: 1} ]
    // id.rows[0]: {id: 1}
    // id.rows[0].id: 1
    

    let array2: any[] = [];
    let dbres2 = { rows: array2 };
    if (content_type) {
      for (const type in content_type) {
        const res = await client.query('INSERT INTO resource_type (id, content_type) ' +
        'VALUES ($1, $2) RETURNING *;', [dbres.rows[0].id, content_type[type]]);
        array2.push(res.rows[0].content_type);
      }
    } else {
        array2 = [];
    }
    
    let array3: any[] = [];
    let dbres3 = { rows: array3 };
    if (cat_tags) {
      for (const tag in cat_tags) { 
        const res = await client.query('INSERT INTO resource_tags (id, cat_tags) ' +
        'VALUES ($1, $2) RETURNING *;', [dbres.rows[0].id, cat_tags[tag]]);
        array3.push(res.rows[0].cat_tags);
      }
    } else {
        array3 = [];
    }

    const dbres4 = await client.query('INSERT INTO recommendations (id, recommender, is_faculty, mark_stage, was_used) ' +
    'VALUES ($1, $2, $3, $4, $5) RETURNING *;', [dbres.rows[0].id, recommender, is_faculty, mark_stage, was_used]);
    
    await client.query("COMMIT");
    res.json([dbres.rows, dbres2.rows, dbres3.rows, dbres4.rows]);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message);
  }
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
