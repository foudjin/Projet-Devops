const express = require('express');
const path = require('path');
const {createClient} = require('redis');
const app = express();
const PORT = process.env.PORT || 3000;

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
const redisClient = createClient({
  url: redisUrl
});
redisClient.on('error', (err) => console.error('Erreur Redis :', err));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Afficher la liste
app.get('/', async (req, res) => {
  try {
    const teacherIds = await redisClient.sMembers('enseignants:ids');
    const teachers = [];

    for (const id of teacherIds) {
      const teacherData = await redisClient.hGetAll(`enseignants:${id}`);
      teachers.push({ id, ...teacherData });
    }

    res.render('index', { teachers });
  } catch (err) {
    // ** MODIFIÉ : Log clair de l'erreur GET **
    console.error("Erreur GET / :", err);
    res.status(500).send("Erreur serveur");
  }
});

// 2. Formulaire
app.get('/nouveau', (req, res) => {
  res.render('nouveau');
});

// 3. Traiter l'enregistrement
app.post('/nouveau', async (req, res) => {
  try {
    const { nom, prenom, matiere, email } = req.body;
    
    const emailExists = await redisClient.sIsMember('enseignants:emails', email);
    if (emailExists) {
      // ** MODIFIÉ : Assure le retour exact du texte attendu par le test **
      return res.status(400).send("cet enseignat existe deja");
    }

    const teacherId = Date.now().toString();
    await redisClient.hSet(`enseignants:${teacherId}`, { nom, prenom, matiere, email });
    await redisClient.sAdd('enseignants:ids', teacherId);
    await redisClient.sAdd('enseignants:emails', email);

    res.redirect('/');
  } catch (err) {
    // ** MODIFIÉ : Log clair de l'erreur POST **
    console.error("Erreur POST /nouveau :", err);
    res.status(500).send("Erreur lors de l'enregistrement");
  }
});

async function startServer() {
  try {
    // On lance la connexion à Redis en arrière-plan
    await redisClient.connect();
    console.log('Connecté à Redis avec succès !');
  } catch (err) {
    console.error("Impossible de se connecter à Redis", err);
  }
}
 // 1. On connecte Redis au démarrage
startServer();
if (process.env.NODE_ENV !== 'test') {
  
  // 2. On ouvre IMMÉDIATEMENT le port pour que Render valide le déploiement
  app.listen(PORT, () => {
    console.log(`Serveur démarré et en écoute sur le port ${PORT}`);
  });
}

module.exports = { app, redisClient, startServer };


