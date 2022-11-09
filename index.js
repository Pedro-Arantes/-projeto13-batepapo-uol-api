import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from 'dayjs'
import  "dayjs/locale/pt-br.js ";

//Config
dotenv.config();
const app = express();
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
const time = dayjs().locale("pt-br").format("HH:MM:SS")
app.use(cors());
app.use(express.json());
//Collections
let participants;
let messages;

mongoClient.connect().then(() => {
	db = mongoClient.db("Bate-papo_UOL_BD");
  messages =  db.collection("messages")
  participants = db.collection("participants")
});






app.post("/participants", (req, res) => {

  const {name} = req.body
 
  if (!name ||  typeof name !== "string") {
    res.status(422).send("Todos os Campos São obrigatórios")
    return
  }

 

  const obj = {
    name: name, 
    lastStatus: Date.now()
  }
  const msg = {
    from: name, 
    to: 'Todos', 
    text: 'entra na sala...', 
    type: 'status', 
    time: time
  }
  messages.insertOne(msg)
	participants.insertOne(obj).then(()=> res.sendStatus(201));

});

app.get("/participants", (req, res) => {
	participants.find().toArray().then((part)=> res.send(part));
});

app.post("/messages", (req,res)=>{

  const {to,text,type} = req.body;
  const {user} = req.headers;
  console.log(type)

  const verTo = !to || typeof to !== "string" ? true:false;
  const verText = !text || typeof text !== "string" ? true:false;
  const verType = type !== "message " && type !== 'private_message' ? true:false;
  
  participants.find({name: user}).toArray().then((part)=>{

    
    const verFrom = part.length  <= 0 ? true:false;
    console.log(verType )

    if (verTo|| verText ||verType||verFrom) {
      res.sendStatus(422);
      return
    }
  
    const msg = {
      from: user, 
      to: to, 
      text: text, 
      type: type, 
      time: time
    }
  
    messages.insertOne(msg).then(()=>res.sendStatus(201))

  })
  

  

});


app.listen(5000, () => {
    console.log('Running on http://localhost:5000')
  });
