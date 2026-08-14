let currentQuestionIndex = 0;
let score = 0;
let questionsData = [];
let currentTopic = 'international';
let jsonFile = 'international_affairs.json';
let topicTitle = 'International Affairs Mock';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Premium Access Check
  const isSubscribed = localStorage.getItem("examedge_subscribed") === "true";
  if (!isSubscribed) {
    alert("This is a Premium feature. Please subscribe to access the Interactive Mock Tests.");
    window.location.href = "index.html";
    return;
  } else {
    // Hide overlay
    document.getElementById("premiumOverlay").classList.add("hidden");
    
    // Parse URL for topic
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get('topic');
    
    if (topic && topic.startsWith('mock_group_')) {
      currentTopic = topic;
      jsonFile = `${topic}.json`;
      const mockTitles = {
        'mock_group_1': 'Indexes, Reports & International Affairs',
        'mock_group_2_3': 'Economy, Banking, Science & Tech',
        'mock_group_4': 'Awards, Honours & Sports',
        'mock_group_5': 'Polity, Governance & Environment',
        'mock_group_6': 'Books, Authors & Miscellaneous'
      };
      topicTitle = mockTitles[topic] ? `${mockTitles[topic]} Mock` : `Mock Test`;
    } else {
      currentTopic = 'mock_group_1';
      jsonFile = 'mock_group_1.json';
      topicTitle = 'Indexes, Reports & International Affairs Mock';
    }
    
    // Update UI title
    document.getElementById('mockPageTitle').innerText = topicTitle;
    document.title = `${topicTitle} - ExamEdge`;
    
    loadQuizData();
  }
});

async function loadQuizData() {
  try {
    const res = await fetch(jsonFile);
    if (!res.ok) throw new Error("Failed to load JSON");
    questionsData = await res.json();
    
    document.getElementById('totalQuestionsCount').innerText = questionsData.length;
    document.getElementById('loadingState').style.display = 'none';
    
    // Start Quiz
    if(questionsData.length > 0) {
      document.getElementById('questionCard').classList.add('active');
      renderQuestion();
    } else {
      document.getElementById('loadingState').innerHTML = '<p>No questions found.</p>';
      document.getElementById('loadingState').style.display = 'block';
    }
    
  } catch (err) {
    document.getElementById('loadingState').innerHTML = '<p>Error loading mock test. Please try again.</p>';
    console.error(err);
  }
}

function renderQuestion() {
  const q = questionsData[currentQuestionIndex];
  
  // Update Header Progress
  document.getElementById('questionCounter').innerText = `Question ${currentQuestionIndex + 1} of ${questionsData.length}`;
  document.getElementById('scoreCounter').innerText = `Score: ${score}`;
  document.getElementById('progressFill').style.width = `${((currentQuestionIndex) / questionsData.length) * 100}%`;
  
  // Reset UI
  document.getElementById('questionText').innerText = q.question;
  const optionsGrid = document.getElementById('optionsGrid');
  optionsGrid.innerHTML = '';
  
  document.getElementById('explanationBox').classList.remove('visible');
  document.getElementById('nextBtn').classList.remove('visible');
  if (currentQuestionIndex === questionsData.length - 1) {
    document.getElementById('nextBtn').innerText = "Finish Test 🏁";
  }
  
  Object.entries(q.options).forEach(([key, text]) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<strong>${key}</strong> &nbsp; ${text}`;
    
    btn.onclick = () => handleAnswer(key, btn, q.correct, q.explanation);
    
    btn.dataset.key = key;
    optionsGrid.appendChild(btn);
  });
}

function handleAnswer(selectedKey, selectedBtn, correctKey, explanation) {
  const allBtns = document.querySelectorAll('.option-btn');
  
  // Disable all
  allBtns.forEach(b => {
    b.classList.add('disabled');
    if (b.dataset.key !== selectedKey && b.dataset.key !== correctKey) {
      b.classList.add('dimmed');
    }
  });
  
  // Check correctness
  if (selectedKey === correctKey) {
    selectedBtn.classList.add('correct');
    score++;
    document.getElementById('scoreCounter').innerText = `Score: ${score}`;
  } else {
    selectedBtn.classList.add('incorrect');
    // Highlight correct one
    allBtns.forEach(b => {
      if (b.dataset.key === correctKey) b.classList.add('correct');
    });
  }
  
  // Show Explanation
  document.getElementById('explanationText').innerText = explanation;
  document.getElementById('explanationBox').classList.add('visible');
  
  // Show Next Button
  document.getElementById('nextBtn').classList.add('visible');
}

function nextQuestion() {
  currentQuestionIndex++;
  
  if (currentQuestionIndex < questionsData.length) {
    renderQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  document.getElementById('questionCard').classList.remove('active');
  document.getElementById('resultCard').classList.add('active');
  
  document.getElementById('finalScore').innerText = `${score} / ${questionsData.length}`;
  
  const percentage = (score / questionsData.length) * 100;
  let msg = "Keep practicing!";
  if (percentage >= 90) msg = "Outstanding! You're ready for the exam! 🏆";
  else if (percentage >= 70) msg = "Great job! You have a solid grasp! 🌟";
  else if (percentage >= 50) msg = "Good effort! A little more revision will help! 📚";
  
  document.getElementById('finalMessage').innerText = msg;
}
