//dotenv för att inte behöva hårdkoda in känsliga lösenord och liknande
require("dotenv").config();
const express = require("express");

//bytt ut sqlite3 till postgre
const { Client } = require("pg");
const app = express();
const PORT = process.env.PORT || 3000;

//Databasen
const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:process.env.DB_PORT
});

client.connect()
.then(() => console.log("PostgreSql har connectat!"))
.catch(err => console.error("Anslutningsfel: ", err));

//variabel för att skapa tabellen courses
const queryTable = `
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    course_code TEXT NOT NULL UNIQUE,
    course_name TEXT NOT NULL,
    syllabus TEXT,
    progression TEXT
    )
`;

//en förfrågan till databasen om att "göra" queryTable (se ovan). Om det går igenom så skapas tabellen
client.query(queryTable)
.then(() => console.log("Tabellen courses skapad!"))
.catch(err => console.error("Fel vid skapande av tabell: ", err));

//Inställningar - app.set, app.use
app.set("view engine", "ejs");

//app.use för middleware - requests o dyl måste gå igenom middleware först
//den nedan hämtar från mappen public som innehåller statiska filer, som t.ex. CSS
app.use(express.static("public"));

//tydligen ingår body-parser i den nedan?
//behövs för att kunna läsa req.body.course_code, req.body.course_name osv.
app.use(express.urlencoded({ extended: true }));

//routes - hämta det som är "synligt"
//Start
app.get("/", async (req, res) => {

    //variabel för msg - i index.ejs finns en ejs som ska visas om något gått fel senare
    const msg = req.query.msg;
    try{
        const result = await client.query("SELECT * FROM courses ORDER BY progression ASC");
        res.render("index", {
            courses: result.rows, 
            msg
        });
    }catch(err){
        console.error(err);
        res.send("Ett fel inträffade! Startsidan gick inte att hämta!")
    }
})

//About/Om webbplatsen sida
app.get("/about", async (req, res) => {
    try{
        res.render("about");
    }catch(err){
        console.error(err);
        res.send("Ett fel inträffade! About sidan gick inte att hämta!")
    }
})

//Lägg till kurs - formulär sidan
app.get("/add", async (req, res) => {
    try{
        res.render("add", {
        message: "", 
        news: "",
        course_code: "",
        course_name: "",
        syllabus: "",
        progression: ""
        })
    }catch(err){
        console.error(err);
        res.send("Ett fel inträffade! Sidan gick inte att hämta!")
    }
})

//Lägg till kurs - POST
//req.body - hämta data som användaren skriver in i requestens body baserat på name. T.ex. name="course_code"
app.post("/add", async (req, res) => {
    const courseCode = req.body.course_code;
    const courseName = req.body.course_name;
    const syllabus = req.body.syllabus;
    const progression = req.body.progression;

    /*validering för att kontrollera om något obligatoriskt fält är tomt.
    Är det tomma input, ladda om sidan med render och visa meddelande: message i ejs ska visas
    course_code: courseCode för att, ifall användaren har skrivit in något i en input, så står det kvar*/
    if(!courseCode.trim() || !courseName.trim()){
        return res.render("add", {
            message: "Fyll i alla obligatoriska fält!",
            news: "",
            course_code: courseCode,
            course_name: courseName,
            syllabus: syllabus,
            progression: progression
        })
    }
    try{
        /*förfrågan till databasen om allt ovan går igenom: skapa en insert  med dessa värden. Värden skrivs inte in explicit här för säkerhets skull*/
        await client.query(
            "INSERT INTO courses (course_code, course_name, syllabus, progression) VALUES ($1,$2,$3,$4)",
            //en array där faktiska värden sparas och matchas mot ovan. Sparas i databasen om allt går bra
            [courseCode, courseName, syllabus, progression]
        );
        console.log("Ny kurs tillagd!");
        //vid render: lägg till meddelandet news för att visa användaren att det fungerade. Töm alla inputs.
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
        //samma princip som ovan, fast message visas istället i ejs. Behåll det användaren skrivit in i input så den kan kontrollera
        return res.render("add", {
            message: "Något gick fel! Kurskoden kanske finns redan!", 
            news: "",
            course_code: courseCode,
            course_name: courseName,
            syllabus: syllabus,
            progression: progression
        });
    }
});

app.post("/delete/:id", async (req, res) => {
    //skapa variabel för id
    const id = req.params.id;
    try{
        await client.query("DELETE FROM courses WHERE id = $1", [id]);
        /*testat redirect. Med / först = gå till startsidan. 
        En ? för att visa en query - msg. Msg matchar i index.ejs en ejs parameter.
        i app.get("/" skapas variabel för msg. Ska visa ett meddelande till användaren
        när kurs tas bort*/
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