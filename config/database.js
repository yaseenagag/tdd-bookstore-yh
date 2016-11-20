const pgp = require( 'pg-promise' )()
const pgpdb = pgp({ database: 'tdd' })


const resetDb = () => {
  return Promise.all([
    pgpdb.query('delete from books'),
    pgpdb.query('delete from authors'),
    pgpdb.query('delete from genres'),
    pgpdb.query('delete from book_authors'),
    pgpdb.query('delete from book_genres')
  ])
}


module.exports = { resetDb }
