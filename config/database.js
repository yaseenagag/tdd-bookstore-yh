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

const createBook = (title, year) => {
  return pgpdb.query('insert into books( title, year ) values( $1, $2 ) returning id', [ title, year ])
    .then(result => result[0].id)
}

const createAuthor = author => {
  return pgpdb.query('insert into authors( name ) values( $1 ) returning id', [ author ])
    .then(result => result[0].id)
}

const createGenre = genre => {
  return pgpdb.query('insert into genres( name ) values( $1 ) returning id', [ genre ])
    .then(result => result[0].id)
}

const joinBookAuhor = (bookId, authorId) => {
  return pgpdb.query('insert into book_authors ( book_id, author_id ) values ( $1, $2 )', [ bookId, authorId ])
}

const joinBookGenre = (bookId, genreId) => {
  return pgpdb.query('insert into book_genres ( book_id, genre_id ) values ( $1, $2 )', [ bookId, genreId ])
}

const createWholeBook = book => {
  return Promise.all([
    createBook(book.title, book.year),
    createAuthor(book.author),
    Promise.all(
      book.genres.sort().map(genre => {
        return createGenre(genre)
      })
    )
  ]).then(results => {
    const bookId = results[0]
    const authorId = results[1]
    const genreIds = results[2]

    joinBookAuhor(bookId, authorId)

    genreIds.forEach(genreId => {
      joinBookGenre(bookId, genreId)
    })

    book.id = bookId

    return book
  })
}

//// this needs to get author and genres too
const getTenBooks = () => {
  return pgpdb.query('select * from books limit 10')
}

module.exports = { resetDb, createWholeBook, getTenBooks }
