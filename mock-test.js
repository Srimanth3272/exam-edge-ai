document.addEventListener('DOMContentLoaded', () => {
  loadQuestions();
});

async function loadQuestions() {
  const container = document.getElementById('questionsContainer');
  
  try {
    const res = await fetch('international_affairs.json');
    if (!res.ok) throw new Error("Failed to load JSON");
    const questions = await res.json();
    
    container.innerHTML = '';
    
    questions.forEach((q, index) => {
      const card = document.createElement('div');
      card.className = 'question-card';
      
      const qText = document.createElement('div');
      qText.className = 'question-text';
      qText.innerText = `Q${index + 1}. ${q.question}`;
      card.appendChild(qText);
      
      const optionsGrid = document.createElement('div');
      optionsGrid.className = 'options-grid';
      
      // We'll store option buttons to disable them after click
      const optionBtns = [];
      
      Object.entries(q.options).forEach(([key, text]) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<strong>${key}</strong> &nbsp; ${text}`;
        
        btn.onclick = () => {
          // Disable all buttons in this question
          optionBtns.forEach(b => b.classList.add('disabled'));
          
          if (key === q.correct) {
            btn.classList.add('correct');
          } else {
            btn.classList.add('incorrect');
            // highlight the correct one
            optionBtns.find(b => b.dataset.key === q.correct)?.classList.add('correct');
          }
          
          // Show explanation
          expBox.classList.add('visible');
        };
        
        btn.dataset.key = key;
        optionBtns.push(btn);
        optionsGrid.appendChild(btn);
      });
      
      card.appendChild(optionsGrid);
      
      const expBox = document.createElement('div');
      expBox.className = 'explanation-box';
      
      const expTitle = document.createElement('div');
      expTitle.className = 'explanation-title';
      expTitle.innerText = 'Explanation';
      
      const expText = document.createElement('div');
      expText.className = 'explanation-text';
      expText.innerText = q.explanation;
      
      expBox.appendChild(expTitle);
      expBox.appendChild(expText);
      
      card.appendChild(expBox);
      container.appendChild(card);
    });
    
  } catch (err) {
    container.innerHTML = `<div class="loading-state"><p>Error loading questions. Please try again later.</p></div>`;
    console.error(err);
  }
}
