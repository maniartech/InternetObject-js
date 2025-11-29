import { loadDoc, parse, stringify } from '../src/index';

describe('Trial Debug Playground', () => {

  it('reorders late keyed optional member into positional slot', () => {

    const input = `
      ~ page: 1
      ~ pageCount: 10
      ~ $borrower: {userId:string, dueDate:date}
      ~ $borrowedBooks: {bookIsbn:number, borrowDate:date}
      ~ $users: {userId:string, name:string, membershipType:{type:string, choices:[Standard, Premium]}, currentlyBorrowedBooks:[$borrowedBooks]}
      ~ $books: {title:string, author:string, isbn:number, availability:bool, categories:[string], published:number, borrowedBy?: $borrower}
      ~ $library: {name: string, address: string}
      --- l: $library
      # Bookville Library
      City Central Library, "123 Library St, Bookville"

      --- b: $books
      ~ The Great Gatsby, "F. Scott Fitzgerald", 1234567890, T,[Fiction, Classic], 1925
      ~ "1984", George Orwell, 2345678901, F, [Fiction, Dystopian], 1949, { user123, d"2024-02-20"}

      --- subscribers: $users
      ~ user123, John Doe, Standard,  [{2345678901,d"2024-01-20"}]
      ~ user456, Jane Smith, Premium, []
    `;

    const doc = parse(input, null);
    // Request types (for schema line) but data rows should stay positional without keys
    const iotext = stringify(doc, undefined, undefined, { includeTypes: true });

    console.log('Full output:\n', iotext);

    // Also check just the data without schema
    const dataOnly = stringify(doc);
    console.log('Data only:\n', dataOnly);
  })

  it('loads and stringifies json into io format', () => {
    const jsonData = {
      name: "City Central Library",
      address: "123 Library St, Bookville",
      books: [
        {
          title: "The Great Gatsby",
          author: "F. Scott Fitzgerald",
          isbn: 1234567890,
          availability: true,
          categories: ["Fiction", "Classic"],
          published: 1925
        },
        {
          title: "1984",
          author: "George Orwell",
          isbn: 2345678901,
          availability: false,
          categories: ["Fiction", "Dystopian"],
          published: 1949,
          borrowedBy: {
            userId: "user123",
            dueDate: "2024-02-20"
          }
        }
      ],
      subscribers: [
        {
          userId: "user123",
          name: "John Doe",
          membershipType: {
            type: "Standard",
            choices: ["Standard", "Premium"]
          },
          currentlyBorrowedBooks: [
            {
              bookIsbn: 2345678901,
              borrowDate: "2024-01-20"
            }
          ]
        }
      ]
    };

    const doc = loadDoc(jsonData, undefined, { inferDefs: true });
    // Use includeHeader: true to include schema definitions in output
    const iotext = stringify(doc, undefined, undefined, { includeHeader: true });

    console.log('IO Format from JSON:\n', iotext);

    // Verify the output can be parsed back
    const reparsed = parse(iotext, null);
    console.log('Reparsed successfully');
  });

});