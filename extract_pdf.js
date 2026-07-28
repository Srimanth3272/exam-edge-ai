const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('1785217185.pdf');

pdf(dataBuffer).then(function(data) {
    console.log("Pages:", data.numpages);
    const fullText = data.text;
    console.log("Total length:", fullText.length);
    
    // We want to extract 'International Affairs' questions.
    // Let's write the text to a temp text file so I can examine it.
    fs.writeFileSync('pdf_text.txt', fullText);
    console.log('Text saved to pdf_text.txt');
}).catch(err => {
    console.error(err);
});
