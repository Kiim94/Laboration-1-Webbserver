require("dotenv").config();
const express = require("express");

//bytt ut sqlite3 till postgre
const { Client } = require("pg");
const app = express();
const PORT = process.env.PORT || 3000;

//Databasen
const db = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:process.env.DB_PORT
});

db.connect()
.then(() => console.log("PostgreSql har connectat!"))
.catch(err => console.error("Anslutningsfel: ", err));

const createTableQuery = `
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    course_code TEXT NOT NULL UNIQUE,
    course_name TEXT NOT NULL,
    syllabus TEXT,
    progression TEXT
    )
`;

db.query(createTableQuery)
.then(() => console.log("Tabellen courses skapad!"))
.catch(err => console.error("Fel vid skapande av tabell: ", err));

//inställningar
app.set("view engine", "ejs");
app.use(express.static("public"));

//tydligen ingår body-parser i den nedan?
app.use(express.urlencoded({ extended: true }));

//routes - hämta det som är "synligt"
//Start
app.get("/", async (req, res) => {
    const msg = req.query.msg;
    try{
        const result = await db.query("SELECT * FROM courses ORDER BY progression DESC");
        res.render("index", {
            courses: result.rows, 
            msg
        });
    }catch(err){
        console.error(err);
        res.send("Ett fel inträffade!")
    }
})

//About/Om webbplatsen
app.get("/about", async (req, res) => {
    try{
        res.render("about");
    }catch(err){
        console.error(err);
        res.send("Ett fel inträffade!")
    }
})

//Lägg till kurs - formulär
app.get("/add", async (req, res) => {
    try{
        res.render("add", {
        message: "", 
        news: "",
        })
    }catch(err){
        console.error(err);
        res.send("Ett fel inträffade!")
    }
})

//Lägg till kurs - POST
app.post("/add", async (req, res) => {
    const courseCode = req.body.course_code;
    const courseName = req.body.course_name;
    const syllabus = req.body.syllabus;
    const progression = req.body.progression;

    if(!courseCode.trim() || !courseName.trim()){
        return res.render("add", {
            message: "Fyll i alla obligatoriska fält!",
            news: "",
            course_code: courseCode,
            course_name: courseName,
            syllabus,
            progression
        })
    }
    try{
        await db.query(
            "INSERT INTO courses (course_code, course_name, syllabus, progression) VALUES ($1,$2,$3,$4)",
            [courseCode, courseName, syllabus, progression]
        );
        console.log("Ny kurs tillagd med id!");
        res.render("add", {
            message: "",
            news: "Kurs tillagd!",
            course_code: "",
            course_name: "",
            syllabus: "",
            progression: ""
        });

    }catch (err){
        console.error(err);
        return res.render("add", {
            message: "Något gick fel! Kurskoden kanske finns redan!", 
            news: "",
        });
    }
});

app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;
    try{
        await db.query("DELETE FROM courses WHERE id = $1", [id]);
        res.redirect("/?msg=Kurs borttagen");
    }catch(err){
        console.error(err);
        return res.redirect("/?msg=Kunde inte ta bort kursen");
    }
})

//starta server
app.listen(PORT, () => {
    console.log("Server körs på port: " + PORT);
})