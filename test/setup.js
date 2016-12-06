process.env.NODE_ENV = 'test'
process.env.PORT = process.env.PORT || '3123'

global.chai = require('chai')
global.expect = chai.expect
global.chaiHttp = require('chai-http')
global.server = require('../server')

chai.use(chaiHttp)
chai.config.includeStack = true

global.browserInstance

beforeEach(() => {
  global.browserInstance = chai.request.agent(server)
  /*
   * This request needs to empty out and migrate up your database
   */
  return request('post', '/api/test/reset-db')
    .then(response => {
      if (response.status !== 200) throw new Error(`

Failed to reset your database!

Please ensure your app responds to:
  POST /api/test/reset-db

This endpoint should truncate your entire database as well as migrate it up to your latest schema.

Note: This request is sent before every single mocha test via a \`beforeEach\` in /test/setup.js
      `)
    })
})

// request('GET', '/api/users/12').then(response)
global.request = (method, path, postBody) => {
  method = method.toLowerCase()
  return new Promise((resolve, reject) => {
    var req = browserInstance[method](path)
    if (method === 'post' && postBody) req = req.send(postBody)
    req.end((error, response) => {
      if (error && error.status >= 500) {
        console.warn('Server Error: '+response.body.error.message)
        console.warn(response.body.error.stack)
        reject(error)
      }else{
        response.request = {
          method, path, postBody
        }
        resolve(response)
      }
    })
  })
}

