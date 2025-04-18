// content.js
function extractChat() {
  const threadDiv = document.querySelector('#thread');
  if (!threadDiv) {
    console.error('Could not find #thread div');
    return;
  }

  const chatContainer = threadDiv.querySelector('[role="presentation"] > div:nth-child(2)');
  if (!chatContainer) {
    console.error('Could not find chat container div');
    return;
  }

  const articles = chatContainer.querySelectorAll('article');
  
  let model = articles[1].querySelector('[data-message-author-role="assistant"]').getAttribute('data-message-model-slug');
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  let datetime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  let markdown = '# Chat with GPT\n';
  markdown += `Date: ${datetime}\n`;
  markdown += `Model: ${model}\n\n`;
  markdown += '# Conversation\n';
	
  articles.forEach(article => {
    const messageDiv = article.querySelector('[data-message-author-role="user"], [data-message-author-role="assistant"]');
    if (messageDiv) {
      const authorRole = messageDiv.getAttribute('data-message-author-role');
      markdown += `## ${authorRole.charAt(0).toUpperCase() + authorRole.slice(1)}:\n`;
      markdown += convertHtmlToMarkdown(messageDiv.innerHTML);
      markdown += '';
    }
  });
  
  markdown = markdown.replace(/\n\n+/g, '\n\n');
  downloadMarkdown(markdown);
}

function convertHtmlToMarkdown(html) {
  let md = '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  function traverse(node) {
    if (!node) return;

    switch (node.nodeType) {
      case Node.TEXT_NODE:
        md += node.textContent;
        break;
      case Node.ELEMENT_NODE:
        switch (node.tagName.toLowerCase()) {
          case 'h1':
            md += `# ${node.textContent}\n`;
            break;
          case 'h2':
            md += `## ${node.textContent}\n`;
            break;
          case 'h3':
            md += `### ${node.textContent}\n`;
            break;
          case 'strong':
            md += `**${node.textContent}**`;
            break;
          case 'em':
            md += `*${node.textContent}*`;
            break;
          case 'li':
  			// Check if parent is an ordered list
  			const isOrderedLi = node.parentElement && node.parentElement.tagName.toLowerCase() === 'ol';
  			const itemPrefixLi = isOrderedLi ? `${index + 1}.` : '*';
  			md += `${itemPrefixLi} ${node.textContent.trim()}\n`;
  			break;

		  case 'ol':
  			// Process each list item within the ordered list
  			let counter = 1;
  			Array.from(node.children).forEach(li => {
    		if (li.tagName.toLowerCase() === 'li') {
      			md += `${counter}. ${li.textContent.trim()}\n`;
      			counter++;
    			}
  			});
  			md += '\n';
  		    break;

		  case 'ul':
  			// Process each list item within the unordered list
  			Array.from(node.children).forEach(li => {
    			if (li.tagName.toLowerCase() === 'li') {
      			md += `* ${li.textContent.trim()}\n`;
    			}
  			});
  			md += '\n';
  			break;
          case 'pre':
            md += '```' + node.childNodes[0].childNodes[0].textContent + '\n'+ node.childNodes[0].childNodes[2].textContent + '\n```\n';
            break;
          case 'code':
            md += '`' + node.textContent + '`';
            break;
          case 'table':
            let tableMarkdown = '\n';
            const rows = node.querySelectorAll('tr');
            rows.forEach((row, rowIndex) => {
              const cells = row.querySelectorAll('td, th');
              tableMarkdown += '| ' + Array.from(cells).map(cell => cell.textContent.trim()).join(' | ') + ' |\n';
              if (rowIndex === 0) {
                tableMarkdown += '|' + '--- |'.repeat(cells.length) + '\n';
              }
            });
            md += tableMarkdown + '\n';
            break;
          case 'hr':
	    md += '\n<hr>\n';
            break;
          case 'div':
          case 'p':
            Array.from(node.childNodes).forEach(traverse);
            md += '\n';
            break;
          default:
            Array.from(node.childNodes).forEach(traverse);
        }
        break;
    }
  }

  traverse(body);
  return md;
}

function downloadMarkdown(markdown) {
  // Generate filename
  const now = new Date();
  const dateString = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  let fileNumber = 1;
  let filename = `${dateString}-${fileNumber.toString().padStart(2, '0')}.md`;

  // Check for existing files (this part might need adaptation depending on how you can access the filesystem)
  // The below logic assumes you can't directly check the filesystem from the browser
  let existingFiles = localStorage.getItem('chatgpt_export_files')
  existingFiles = existingFiles ? JSON.parse(existingFiles) : [];

  while (existingFiles.includes(filename)) {
    fileNumber++;
    filename = `${dateString}-${fileNumber.toString().padStart(2, '0')}.md`;
  }

  existingFiles.push(filename);
  localStorage.setItem('chatgpt_export_files', JSON.stringify(existingFiles));


  // Download the file
  const downloadLink = document.createElement('a');
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  downloadLink.href = url;
  downloadLink.download = filename;

  document.body.appendChild(downloadLink);
  downloadLink.click();

  URL.revokeObjectURL(url);
  document.body.removeChild(downloadLink);
}

// Inject the UI into the page
function injectUI() {
  fetch(chrome.runtime.getURL('injected_ui.html'))
    .then(response => response.text())
    .then(html => {
      const targetElement = document.getElementById('conversation-header-actions');
      if (targetElement && !document.getElementById('extractButtonInjected')) { // Check if it's already injected
        targetElement.insertAdjacentHTML('afterbegin', html);
        document.getElementById('extractButtonInjected').addEventListener('click', extractChat);
      }
    })
    .catch(error => console.error('Could not inject UI:', error));
}

// Initial injection
injectUI();

// Create a Mutation Observer
const observer = new MutationObserver((mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      // Check if the target element was added or re-rendered
      const targetElement = document.getElementById('conversation-header-actions');
      if (targetElement && !document.getElementById('extractButtonInjected')) {
        injectUI();
      }
    }
  }
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Optionally, disconnect the observer when it's no longer needed (e.g., on page unload)
// window.addEventListener('beforeunload', () => {
//   observer.disconnect();
// });