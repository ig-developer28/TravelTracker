import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 4000;

let users = [
  { id: 1, name: "Om", color: "teal" },
  { id: 2, name: "Shah", color: "powderblue" },
];

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "1234",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUser=14;


async function checkVisited(){
  const result = await db.query(`SELECT country_code FROM visited_countries where user_id=${currentUser}`);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code.toUpperCase());
  });
  // console.log(countries);
  return countries;
}

async function getCurrentUser(){
  const result= await db.query('SELECT * FROM users ORDER BY id ASC');
  users=result.rows;
  // console.log(users);
  // console.log(currentUser);
  // console.log(users.find((user)=>{user.id==currentUser}));
  return users.find((user)=>user.id==currentUser);//currentUser is the id of the currentUser.
}


// GET home page
app.get("/", async (req, res) => {
  let countries=await checkVisited();
  let currentuser=await getCurrentUser();
  // console.log(currentUser);
  res.render("index.ejs", { countries: countries, total: countries.length,color:currentuser.color,users:users });
});

app.post("/add",async(req,res)=>{
  const ans=req.body.country;
  console.log(req.body);
  if(req.body.add=="added"){
  const country_code= await db.query(`SELECT country_code from countries where country_name LIKE('%${ans}%')`);
  if(country_code.rows.length!==0){
  // console.log(country_code);
  try{
  let countries=await checkVisited();
  if(countries.find((country)=>country==country_code.rows[0].country_code)){
    let currentUser=await getCurrentUser();
    res.render("index.ejs",{error:"country code already exists",total:countries.length,countries:countries,users:users,color:currentUser.color});
  }
  else{
  await db.query(`INSERT INTO visited_countries(country_code,user_id) values('${country_code.rows[0].country_code}',${currentUser})`);
  res.redirect("/");
  }
  }
  catch(err){
    let countries = [];
    const result = await db.query("SELECT country_code FROM visited_countries");
    result.rows.forEach((country) => {
      countries.push(country.country_code.toUpperCase());
    });
    console.log(countries.length);

    res.render("index.ejs",{error:"country code already exists",total:countries.length,countries:countries});
  }
}
else{
  let countries = await checkVisited();
  let currentuser=await getCurrentUser();
  // console.log(countries.length);
  res.render("index.ejs",{ countries: countries, total: countries.length,color:currentuser.color,users:users,error:"country code not present." })
}
}
else{
  const country_code= await db.query(`SELECT country_code from countries where country_name LIKE('%${ans}%')`);
  const user=await getCurrentUser();
  console.log(country_code.rows.country_code);
  console.log(user);
  try{
  let row=await db.query(`DELETE FROM visited_countries WHERE country_code='${country_code.rows[0].country_code}' AND user_id=${user.id} RETURNING *`)
  console.log(row)
  res.redirect("/");
  }
  catch(err){
    console.log(err.stack)
    let countries = await checkVisited();
    // let currentuser=await getCurrentUser();
    // console.log(countries.length);
    res.render("index.ejs",{ countries: countries, total: countries.length,color:currentuser.color,users:users,error:"country code not present." })
  }
}
});

app.post("/user",async(req,res)=>{
  currentUser=req.body['user'];
  console.log(req.body);
  if(currentUser){
  res.redirect("/");
  }
  else if(req.body.add){
    res.render("new.ejs");
  }
  else if(req.body.delete){
    res.render("delete.ejs");
  }
});

app.post("/delete",async(req,res)=>{
  const name = req.body.name;
  const color = req.body.color;
  console.log(name);
  console.log(color);
  try{
  const id=await db.query(`SELECT id from users WHERE name='${name}' AND color='${color}'`);
  console.log(id);
  await db.query(`DELETE FROM visited_countries WHERE user_id=${id.rows[0].id} `);
  await db.query(`DELETE FROM users WHERE name='${name}' AND color='${color}' RETURNING *`);
  // console.log(result.rows);
  }
  catch(err){console.log(err.stack);}
  // const id = result.rows[0].id;
  currentUser = 14;
  res.redirect("/");
});

app.post("/new",async(req,res)=>{
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id;
  currentUser = id;

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
