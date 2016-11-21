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


const getAuthorIdByBookId = bookId => {
  return pgpdb.query('select author_id from book_authors where book_id = $1', [bookId])
    .then(result => result[0].author_id)
}

const getAuthorById = authorId => {
  return pgpdb.query('select name from authors where id = $1', [authorId])
    .then(result => result[0].name)
}

const getAuthorByBookId = bookId => {
  return getAuthorIdByBookId(bookId)
    .then(authorId => {
      return getAuthorById(authorId)
    })
}

const getGenreIdsByBookId = bookId => {
  return pgpdb.query('select genre_id from book_genres where book_id = $1', [bookId])
    .then(results => results.map(resultsObj => resultsObj.genre_id))
}

const getGenreById = genreId => {
  return pgpdb.query('select name from genres where id = $1', genreId)
    .then(result => result[0].name)
}

const getGenresByIds = genreIds => {
  return Promise.all(
    genreIds.map(genreId => {
      return getGenreById(genreId)
    })
  )
}

const getGenresByBookId = bookId => {
  return getGenreIdsByBookId(bookId)
    .then(genreIds => {
      return getGenresByIds(genreIds)
    })
}

const getBookById = bookId => {
  return pgpdb.query('select title, year, id from books where id = $1', bookId)
    .then(result => {
      return result[0]
    })
}

const getWholeBookById = bookId => {
  return Promise.all([
    getBookById(bookId),
    getAuthorByBookId(bookId),
    getGenresByBookId(bookId)
  ])
  .then(results => {
    const book = results[0]
    const author = results[1]
    const genres = results[2]

    let wholeBook = book
    wholeBook.author = author
    wholeBook.genres = genres

    return wholeBook
  })
}

const getFirstTenBookIds = () => {
  return pgpdb.query('select id from books limit 10')
    .then(idsObjs => idsObjs.map(idObj => idObj.id))
}

const getWholeBooksByIds = bookIds => {
  return Promise.all(
    bookIds.map(bookId => getWholeBookById(bookId))
  )
}

// const getTenBooks = () => {
//   return getFirstTenBookIds()
//     .then(bookIds => getWholeBooksByIds(bookIds))
// }

const getTenBooks = () => {
  return pgpdb.query(`
    select books.id,
      books.title,
      books.year,
      authors.name as author,
      json_agg(genres.name order by genres.name asc) as genres
    from books
      join book_genres on books.id = book_genres.book_id
      join genres on book_genres.genre_id = genres.id
      join book_authors on books.id = book_authors.book_id
      join authors on book_authors.author_id = authors.id
    group by books.id, title, year, author
    limit 10
  `)
}



module.exports = { resetDb, createWholeBook, getTenBooks }
