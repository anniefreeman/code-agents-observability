const express = require('express');
const controllers = require('./controllers');

const app = express();

app.use(express.json());

app.get('/ping', controllers.ping);
app.get('/health', controllers.health);

app.get('/items', controllers.listItems);
app.get('/items/:id', controllers.getItem);
app.post('/items', controllers.createItem);
app.put('/items/:id', controllers.updateItem);
app.delete('/items/:id', controllers.deleteItem);

module.exports = app;
