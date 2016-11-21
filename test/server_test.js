const util = require('util');

const BOOKS = require('./books.json')
const GENRES = Object.keys(BOOKS.reduce((genres, book) => {
  book.genres.forEach(genre => genres[genre] = true)
  return genres
}, {})).sort()


const createBook = (attributes) => {
  return request('post', '/api/books', attributes)
    .then(response => {
      if (response.status >= 400 && response.body && response.body.error){
        throw response.body.error
      }
      expectResponseToHaveStatus(response, 201)
      expect(response.headers['content-type']).to
        .eql('application/json; charset=utf-8')
      expect(response.body).to.be.an('object')
      expect(response.body.id).to.be.a('number')
      expect(response.body.title).to.eql(attributes.title)
      expect(response.body.year).to.eql(attributes.year)
      expect(response.body.author).to.eql(attributes.author)
      expect(response.body.genres).to.eql((attributes.genres||[]).sort())
      return response.body
    })
}

const createBooks = (books) =>
  Promise.all(books.map(createBook))

const loadFixtureData = () => createBooks(BOOKS)

const expectResponseToHaveStatus = (response, expectedStatus) => {
  if (response.status === expectedStatus) return
  const requestAsString = `request(${JSON.stringify(response.request.method)}, ${JSON.stringify(response.request.path)}, ${JSON.stringify(response.request.postBody, null, 2)})`.replace(/\n/g, "\n      ")
  throw new Error(`
    Expected the request:

      ${requestAsString}

    …to respond with status ${expectedStatus} but it responded with ${response.status}
  `)
}

describe('HTTP Server', () => {

  describe('GET /ping', () => {
    it('should respond with "pong"', () => {
      return request('get', '/ping').then(response => {
        expectResponseToHaveStatus(response, 200)
        expect(response.text).to.eql('pong')
      })
    })
  })

  describe('POST /api/books', () => {
    it('should create a book', () => {
      return request('post', '/api/books', {
        "title":"Starship Troopers",
        "author":"Robert A. Heinlein",
        "year": 2004,
        "genres": ["Sci-fi", "Space", "Aliens"]
      }).then(response => {
        expectResponseToHaveStatus(response, 201)
        expect(response.headers['content-type']).to
          .eql('application/json; charset=utf-8')
        const book = response.body
        expect(book.title).to.eql("Starship Troopers")
        expect(book.author).to.eql("Robert A. Heinlein")
        expect(book.year).to.eql(2004)
        expect(book.genres).to.eql(["Sci-fi", "Space", "Aliens"].sort())
      })
    })
    context('when missing title', () => {
      it('should render 400 bad request', () => {
        return request('post', '/api/books', {
          "author":"Robert A. Heinlein",
          "year": 2004
        }).then(response => {
          expectResponseToHaveStatus(response, 400)
          expect(response.headers['content-type']).to
            .eql('application/json; charset=utf-8')
          expect(response.body).to.have.any.key('error')
          expect(response.body.error).to.have.any.key('message')
          expect(response.body.error.message).to.eql('title cannot be blank')
        })
      })
    })
  })

  context('with fixture data', () => {
    let fixtures

    const findFixtureForBook = (book) =>
      fixtures.find(fixture => fixture.id === book.id)

    beforeEach(() =>
      loadFixtureData().then(records =>
        fixtures = records
      )
    )

    describe('GET /api/books', () => {
      it('should render 10 books', () => {
        return request('get', '/api/books').then(response => {
          expectResponseToHaveStatus(response, 200)
          expect(response.headers['content-type']).to
            .eql('application/json; charset=utf-8')
          const books = response.body
          expect(books.length).to.eql(10)
          books.forEach(book => {
            const fixture = findFixtureForBook(book)
            expect(fixture).to.eql(book)
          })
        })
      })
    })

    describe('GET /api/books?page=2', () => {
      it('should render the next 10 books', () => {
        return Promise.all([
          request('get', '/api/books'),
          request('get', '/api/books?page=2'),
        ]).then(([page1Request, page2Request]) => {
          const page1Books = page1Request.body
          const page2Books = page2Request.body
          expect(page1Books.length).to.eql(10)
          expect(page2Books.length).to.eql(10)

          const page1BookIds = page1Books.map(book => book.id)
          const page2BookIds = page2Books.map(book => book.id)
          page1BookIds.forEach(bookId => {
            expect(page2BookIds).to.not.include(bookId)
          })
          page2BookIds.forEach(bookId => {
            expect(page1BookIds).to.not.include(bookId)
          })
        })
      })
    })

    describe('GET /api/books?author=phILip', () => {
      it('should render books with authors named "Philip" (case insensitive)', () => {
        return request('get', '/api/books?author=phILip').then(response => {
          expectResponseToHaveStatus(response, 200)
          const books = response.body
          expect(books.length).to.eql(3)
          const bookTitles = books.map(book => book.title).sort()
          expect(bookTitles).to.eql([
            "Do Androids Dream of Electric Sheep?",
            "The Man in the High Castle",
            "Ubik",
          ])
        })
      })
    })

    describe('GET /api/books?title=wORld', () => {
      it('should render books with a title including "world" (case insensitive)', () => {
        return request('get', '/api/books?title=wORld').then(response => {
          expectResponseToHaveStatus(response, 200)
          const books = response.body
          expect(books.length).to.eql(3)
          const bookTitles = books.map(book => book.title).sort()
          expect(bookTitles).to.eql([
            "Brave New World",
            "Ringworld",
            "The War of the Worlds",
          ])
        })
      })
    })

    describe('GET /api/books?year=1953', () => {
      it('should render books published in 1953', () => {
        return request('get', '/api/books?year=1953').then(response => {
          expectResponseToHaveStatus(response, 200)
          const books = response.body
          expect(books.length).to.eql(5)
          const bookTitles = books.map(book => book.title).sort()
          expect(bookTitles).to.eql([
            "Childhood's End",
            "Fahrenheit 451",
            "More Than Human",
            "Second Foundation",
            "The Caves of Steel",
          ])
        })
      })
    })

    describe('GET /api/books?year=1953&title=th', () => {
      it('should render books published in 1953 and with a title that includes the string "th"', () => {
        return request('get', '/api/books?year=1953&title=th').then(response => {
          expectResponseToHaveStatus(response, 200)
          const books = response.body
          expect(books.length).to.eql(2)
          const bookTitles = books.map(book => book.title).sort()
          expect(bookTitles).to.eql([
            "More Than Human",
            "The Caves of Steel",
          ])
        })
      })
    })

    describe('GET /api/authors', () => {
      it('should render 10 authors', () => {
        return request('get', '/api/authors').then(response => {
          expectResponseToHaveStatus(response, 200)
          expect(response.headers['content-type']).to
            .eql('application/json; charset=utf-8')
          const authors = response.body
          expect(authors.length).to.eql(10)
        })
      })
    })

    describe('GET /api/authors?page=2', () => {
      it('should render the next 10 authors', () => {
        return Promise.all([
          request('get', '/api/authors'),
          request('get', '/api/authors?page=2'),
        ]).then(([page1Request, page2Request]) => {
          const page1Authors = page1Request.body
          const page2Authors = page2Request.body
          expect(page1Authors.length).to.eql(10)
          expect(page2Authors.length).to.eql(10)

          const page1AuthorIds = page1Authors.map(author => author.id)
          const page2AuthorIds = page2Authors.map(author => author.id)
          page1AuthorIds.forEach(authorId => {
            expect(page2AuthorIds).to.not.include(authorId)
          })
          page2AuthorIds.forEach(authorId => {
            expect(page1AuthorIds).to.not.include(authorId)
          })
        })
      })
    })

    describe('GET /api/books/12', () => {
      context('when the book exists', () => {
        it('should render book 12', () => {
          return request('get', '/api/books/12').then(response => {
            expectResponseToHaveStatus(response, 200)
            expect(response.headers['content-type']).to
              .eql('application/json; charset=utf-8')
            const book = response.body
            expect(book.id).to.eql(12)
            const fixture = findFixtureForBook(book)
            expect(fixture).to.eql(book)
          })
        })
      })
      context('when the book doesn\'t exist', () => {
        it('should render nothing with status 404', () => {
          return request('get', '/api/books/98989898').then(response => {
            expectResponseToHaveStatus(response, 404)
            expect(response.headers['content-type']).to
              .eql('application/json')
            expect(response.body).to.eql('')
          })
        })
      })
    })

    describe('GET /api/genres', () => {
      it('should render up to 10 genres', () => {
        return request('get', '/api/genres').then(response => {
          expectResponseToHaveStatus(response, 200)
          expect(response.headers['content-type']).to
            .eql('application/json; charset=utf-8')
          const genres = response.body
          expect(genres.length).to.eql(10)
          const genreNames = genres.map(genre => genre.name).sort()
          expect(genreNames).to.eql(GENRES.slice(0,10))
        })
      })
    })

    describe('POST /api/book/12', () => {
      it('should update the book', () => {
        return request('post', '/api/books/12', {
          "title":"Starship Troopers",
          "author":"Robert A. Heinlein",
          "year": 2004,
        }).then(response => {
          expectResponseToHaveStatus(response, 200)
          expect(response.headers['content-type']).to
            .eql('application/json; charset=utf-8')
          const book = response.body
          expect(book.title).to.eql("Starship Troopers")
          expect(book.author).to.eql("Robert A. Heinlein")
          expect(book.year).to.eql(2004)
        })
      })
    })

    describe('POST /api/book/12/delete', () => {
      it('should delete the book', () => {
        return request('get', '/api/books/12')
          .then(response => {
            expectResponseToHaveStatus(response, 200)
          })
          .then(() => request('post', '/api/books/12/delete'))
          .then(response => {
            expectResponseToHaveStatus(response, 200)
            expect(response.headers['content-type']).to
              .eql('application/json')
            expect(response.body).to.eql('')
          })
          .then(() => request('get', '/api/books/12'))
          .then(response => {
            expectResponseToHaveStatus(response, 404)
          })
      })
    })

  })

})
