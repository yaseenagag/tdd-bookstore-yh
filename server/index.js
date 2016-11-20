const express = require('express')
const bodyParser = require("body-parser")
const db = require('../config/database.js')
const server = express()

server.set('port', process.env.PORT || '3000')

server.use(bodyParser.json())

server.get('/ping', (request, response, next) => {
  response.send('pong')
})

server.post('/api/test/reset-db', (request, response, next) => {
  db.resetDb().then(() => {
    response.status(200).end()
  })
})

server.post('/api/books', (request, response, next) => {
  if ( request.body.hasOwnProperty("title") ) {
    db.createWholeBook(request.body).then(book => {
      response.status(201).json(book)
    })
  } else {
    response.status(400).json({
      error: {message: 'title cannot be blank'}
    })
  }
})

server.get('/api/books', (request, response, next) => {
  db.getTenBooks().then((books) => {
    response.status(200).json(books)
  })
})

if (process.env.NODE_ENV !== 'test'){
  server.listen(server.get('port'))
}

module.exports = server
