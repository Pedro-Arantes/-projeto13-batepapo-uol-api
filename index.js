import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from 'dayjs'
import  joi  from "joi";


//Config
dotenv.config();
const app = express();
const mongoClient = new MongoClient(process.env.MONGO_URI);

const time = dayjs().format("HH:mm:ss")
app.use(cors());
app.use(express.json());
//Collections

const userSchema = joi.object({
  name: joi.string().required(),
});
const msgSchema = joi.object({
    to: joi.string().required().min(1),
    text:  joi.string().required().min(1),
    type:  joi.string().required().valid("message", "private_message")
});

try {
  await mongoClient.connect();

} catch (error) {
  console.log(error)
}
const db = mongoClient.db("Bate-papo_UOL_BD");
const messages = db.collection("messages")
const participants = db.collection("participants")

app.post("/participants", async (req, res) => {

  const { name } = req.body
  const validation = userSchema.validate(req.body);

  if (validation.error) {
    res.status(422).send("Todos os Campos São obrigatórios")
    return
  }
  const hasPart = await participants.findOne({ name })
  if (hasPart !== null) {
    res.sendStatus(409);
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
    time: dayjs().format("HH:mm:ss")
  }
  try {
    messages.insertOne(msg)
    await participants.insertOne(obj);
    res.sendStatus(201)
    
  } catch (error) {
    res.sendStatus(500);
    console.log(error);
  }


});

app.get("/participants", async (req, res) => {

  try {
    const part = await participants.find().toArray()
    res.send(part)
    
  } catch (error) {
    console.log(error)
  }

});

app.post("/messages", async (req, res) => {

  const { to, text, type } = req.body;
  const { user } = req.headers;
  const validation = msgSchema.validate(req.body);

  
  

  try {

    const part = await participants.find({ name: user }).toArray()
    const verFrom = part.length <= 0 ? true : false;
    if (validation.error || verFrom) {
      res.sendStatus(422);
      
      return
    }

    const msg = {
      from: user,
      to: to,
      text: text,
      type: type,
      time: dayjs().format("HH:mm:ss")
    }

    await messages.insertOne(msg);
    res.sendStatus(201);
    return

  } catch (error) {
    res.sendStatus(500);
    console.log(error)
  }



});

app.get("/messages", async (req, res) => {

  let  limit = parseInt(req.query.limit);
  const { user } = req.headers;

  if (!limit) {
    try {
      const msg = await messages.find({ $or: [{ from: user }, { to: user }, { to: "Todos" },{type: "message"}] }).toArray()
      
      res.status(200).send(msg)
      return
    } catch (error) {
      res.sendStatus(500);
      console.log(error)
      return
    }

  }
  try {
    let doc = await messages.find({ $or: [{ from: user }, { to: user }, { to: "Todos" },{type: "message"}] }).toArray()
    doc = doc.length;
    const msg = await messages.find({ $or: [{ from: user }, { to: user }, { to: "Todos" },{type: "message"}] }).skip(doc-limit).limit(limit).toArray()
    
    res.status(200).send(msg)
  } catch (error) {
    res.sendStatus(500);
    console.log(error)
  }

})

app.post("/status", async (req, res) => {

  const { user } = req.headers;
  const lastStatus = { $set: { lastStatus: Date.now() } }

  try {
    const part = await participants.find({ name: user }).toArray()
    

    if (part.length === 0) {
      res.sendStatus(404)
      return
    }
    await participants.updateOne({ name: user }, lastStatus)
    res.sendStatus(200)
  } catch (error) {
    res.sendStatus(500);
    console.log(error)
  }





})


setInterval( async ()=>{
  const array = await participants.find().toArray()

  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    const msg = {
      from: element.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format("HH:mm:ss")
    }
    //console.log(Date.now() - element.lastStatus)
    if (Date.now() - element.lastStatus  >= 10000) {
      //console.log("oi")
      try {
        await participants.deleteOne(element)
        await messages.insertOne(msg)
      } catch (error) {
        console.log(error)
      }
    }
  }

}, 15000)


app.listen(5000, () => {
  console.log('Running on http://localhost:5000')
});


