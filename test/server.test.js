const request = require('supertest');

// ** MODIFIÉ : Structure du mock corrigée pour renvoyer un client partagé et mocké proprement **
jest.mock('redis', () => {
  const mClient = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(),
    sIsMember: jest.fn().mockResolvedValue(false),
    sAdd: jest.fn().mockResolvedValue(),
    hSet: jest.fn().mockResolvedValue(),
    sMembers: jest.fn().mockResolvedValue([]),
    hGetAll: jest.fn().mockResolvedValue({}),
  };
  return {
    createClient: jest.fn(() => mClient)
  };
});

const { app, redisClient } = require('../src/server');

describe('tests unitaires', () => {

  test('ne doit pas creer un enseignant si son email existe deja', async () => {
    // ** MODIFIÉ : Forçage explicite du retour true pour le test du doublon **
    redisClient.sIsMember.mockResolvedValue(true);

    const response = await request(app)
      .post('/nouveau')
      .send({
        nom: 'dupont',
        prenom: 'jean',
        matiere: 'maths',
        email: 'jean.dupont@ecole.com'
      });

    expect(response.status).toBe(400);
    expect(response.text).toContain('cet enseignat existe deja');
  });

  test('doit recuperer et afficher correctement la liste de enseignants', async () => {
    // ** MODIFIÉ : Utilisation de mockResolvedValue avec la casse correcte (R majuscule) **
    redisClient.sMembers.mockResolvedValue(['123']);
    redisClient.hGetAll.mockResolvedValue({
      nom: 'martin',
      prenom: 'sophie',
      matiere: 'histoire',
      email: 'sophie.martin@ecole.com'
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('martin');
    expect(response.text).toContain('sophie');
    expect(response.text).toContain('histoire');
  });

});