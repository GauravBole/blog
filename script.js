// App State
const state = {
  posts: [],
  searchQuery: '',
  selectedTag: null,
  currentPage: 1,
  postsPerPage: 5 // Default is 5 posts per page
};

// DOM Cache
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const tagsCloud = document.getElementById('tags-cloud');
const postsGrid = document.getElementById('posts-grid');
const noResults = document.getElementById('no-results');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const homeView = document.getElementById('home-view');
const postView = document.getElementById('post-view');

const postContent = document.getElementById('post-content');
const postTitle = document.getElementById('post-title');
const postMetaDate = document.getElementById('post-meta-date');
const postMetaReadingTime = document.getElementById('post-meta-reading-time');
const postTags = document.getElementById('post-tags');
const readingProgress = document.getElementById('reading-progress');

const paginationControls = document.getElementById('pagination-controls');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageIndicator = document.getElementById('page-indicator');

// Initialize Application
async function init() {
  setupEventListeners();
  await fetchPosts();
  renderTagsCloud();
  handleRouting();
}

// Fetch posts registry (posts.json)
async function fetchPosts() {
  try {
    const response = await fetch('posts.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch posts registry: ${response.statusText}`);
    }
    state.posts = await response.json();
  } catch (error) {
    console.error('Error fetching blog index:', error);
    postsGrid.innerHTML = `
      <div class="loader-container">
        <i data-lucide="alert-triangle" style="color: var(--accent-color); width: 40px; height: 40px;"></i>
        <h3>Failed to load articles</h3>
        <p>There was an error loading the article registry. Make sure 'posts.json' exists.</p>
      </div>
    `;
    lucide.createIcons();
  }
}

// Set up event listeners
function setupEventListeners() {
  // Search handling
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    state.currentPage = 1; // Reset to page 1 on search
    toggleClearSearchBtn();
    renderPostsList();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    state.currentPage = 1; // Reset to page 1
    toggleClearSearchBtn();
    searchInput.focus();
    renderPostsList();
  });

  // Reset Filters button
  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    state.selectedTag = null;
    state.currentPage = 1; // Reset to page 1
    toggleClearSearchBtn();
    
    // Deactivate all tag buttons
    document.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
    
    renderPostsList();
  });

  // Pagination navigation
  prevPageBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderPostsList();
      window.scrollTo({ top: postsGrid.offsetTop - 80, behavior: 'smooth' });
    }
  });

  nextPageBtn.addEventListener('click', () => {
    const filteredCount = getFilteredPosts().length;
    const totalPages = Math.ceil(filteredCount / state.postsPerPage);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderPostsList();
      window.scrollTo({ top: postsGrid.offsetTop - 80, behavior: 'smooth' });
    }
  });

  // Routing trigger
  window.addEventListener('hashchange', handleRouting);

  // Reading Progress Bar handler
  window.addEventListener('scroll', updateReadingProgress);
}

// Show/hide search clear button
function toggleClearSearchBtn() {
  if (state.searchQuery.length > 0) {
    clearSearchBtn.style.display = 'flex';
  } else {
    clearSearchBtn.style.display = 'none';
  }
}

// Render tag filters cloud
function renderTagsCloud() {
  if (!tagsCloud) return;
  
  // Extract all unique tags
  const tagsMap = {};
  state.posts.forEach(post => {
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        tagsMap[tag] = (tagsMap[tag] || 0) + 1;
      });
    }
  });

  const sortedTags = Object.keys(tagsMap).sort((a, b) => tagsMap[b] - tagsMap[a]);
  
  tagsCloud.innerHTML = '';
  sortedTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.textContent = `${tag} (${tagsMap[tag]})`;
    btn.setAttribute('data-tag', tag);
    btn.addEventListener('click', () => handleTagClick(tag, btn));
    tagsCloud.appendChild(btn);
  });
}

// Tag click handler
function handleTagClick(tag, btnElement) {
  state.currentPage = 1; // Reset to page 1 on filter tag change
  if (state.selectedTag === tag) {
    // Deselect if already active
    state.selectedTag = null;
    btnElement.classList.remove('active');
  } else {
    // Select new tag
    state.selectedTag = tag;
    // Update visual states
    document.querySelectorAll('.tag-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tag') === tag);
    });
  }
  renderPostsList();
}

// Calculate reading time dynamically
function calculateReadingTime(markdownText) {
  const wordsPerMinute = 225;
  // Clean markdown syntax to approximate words count
  const cleanText = markdownText
    .replace(/\[.*?\]\(.*?\)/g, '') // remove links
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/<[^>]*>/g, '')        // remove html elements
    .replace(/[#*`_-]/g, '');       // remove layout ticks
  
  const wordCount = cleanText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const time = Math.ceil(wordCount / wordsPerMinute);
  return `${time} min read`;
}

// Filter helper function
function getFilteredPosts() {
  return state.posts.filter(post => {
    // Search filter
    const matchesSearch = 
      post.title.toLowerCase().includes(state.searchQuery) ||
      post.excerpt.toLowerCase().includes(state.searchQuery) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(state.searchQuery)));
      
    // Tag filter
    const matchesTag = !state.selectedTag || (post.tags && post.tags.includes(state.selectedTag));
    
    return matchesSearch && matchesTag;
  });
}

// Render posts grid/list based on search & filters
function renderPostsList() {
  // Clear grid
  postsGrid.innerHTML = '';

  const filteredPosts = getFilteredPosts();
  const totalPages = Math.ceil(filteredPosts.length / state.postsPerPage) || 1;

  // Make sure current page is valid
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }
  if (state.currentPage < 1) {
    state.currentPage = 1;
  }

  // Toggle No Results display
  if (filteredPosts.length === 0) {
    postsGrid.style.display = 'none';
    noResults.classList.remove('hidden');
    paginationControls.classList.add('hidden');
    return;
  } else {
    postsGrid.style.display = 'flex';
    noResults.classList.add('hidden');
  }

  // Slice posts for current page
  const startIndex = (state.currentPage - 1) * state.postsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + state.postsPerPage);

  // Populate list
  paginatedPosts.forEach((post, index) => {
    const postCard = document.createElement('a');
    postCard.href = `#/post/${post.id}`;
    postCard.className = 'post-card';
    postCard.style.animationDelay = `${index * 0.05}s`;
    
    // Format date beautifully
    const formattedDate = formatDate(post.date);
    
    // Generate tag pill HTML
    const tagsHtml = post.tags
      ? post.tags.map(tag => `<span class="post-card-tag">${tag}</span>`).join('')
      : '';

    postCard.innerHTML = `
      <div class="post-card-meta">
        <span class="post-card-date">${formattedDate}</span>
      </div>
      <h3 class="post-card-title">${post.title}</h3>
      <p class="post-card-excerpt">${post.excerpt}</p>
      <div class="post-card-tags">
        ${tagsHtml}
      </div>
    `;
    
    postsGrid.appendChild(postCard);
  });

  // Render pagination controls
  if (totalPages > 1) {
    paginationControls.classList.remove('hidden');
    pageIndicator.textContent = `${state.currentPage} of ${totalPages}`;
    prevPageBtn.disabled = state.currentPage === 1;
    nextPageBtn.disabled = state.currentPage === totalPages;
  } else {
    paginationControls.classList.add('hidden');
  }

  // Re-run Lucide to style injected card icons if any
  lucide.createIcons();
}

// Format date string to "June 26, 2026"
function formatDate(dateString) {
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', options);
  } catch (e) {
    return dateString;
  }
}

// Hash-based router
async function handleRouting() {
  const hash = window.location.hash;
  
  if (hash.startsWith('#/post/')) {
    const postId = hash.replace('#/post/', '');
    await showPostView(postId);
  } else {
    showHomeView();
  }
}

// Show Home View list
function showHomeView() {
  document.body.classList.remove('reading-mode');
  
  postView.classList.remove('active');
  postView.classList.add('hidden');
  
  homeView.classList.add('active');
  homeView.classList.remove('hidden');
  
  // Reset reading progress bar
  readingProgress.style.width = '0%';
  
  // Re-render post lists in case state was updated
  renderPostsList();
  
  window.scrollTo(0, 0);
}

// Show Post Detail View
async function showPostView(postId) {
  // Find post metadata
  const postMeta = state.posts.find(p => p.id === postId);
  
  if (!postMeta) {
    // If not found in loaded posts, try reloading index once
    if (state.posts.length === 0) {
      await fetchPosts();
      const retryPostMeta = state.posts.find(p => p.id === postId);
      if (retryPostMeta) {
        return showPostView(postId);
      }
    }
    show404Post();
    return;
  }

  // Pre-load metadata headings
  postTitle.textContent = postMeta.title;
  postMetaDate.textContent = formatDate(postMeta.date);
  postMetaReadingTime.textContent = 'Calculating...';
  
  // Render tag pills
  postTags.innerHTML = postMeta.tags
    ? postMeta.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('')
    : '';

  // Show the view shell early, scroll to top
  document.body.classList.add('reading-mode');
  
  homeView.classList.remove('active');
  homeView.classList.add('hidden');
  postView.classList.add('active');
  postView.classList.remove('hidden');
  window.scrollTo(0, 0);

  // Show loading indicator in details content
  postContent.innerHTML = `
    <div class="loader-container">
      <div class="spinner"></div>
      <p>Unfolding page content...</p>
    </div>
  `;
  lucide.createIcons();

  // Fetch and render the raw markdown file
  try {
    const response = await fetch(postMeta.file);
    if (!response.ok) {
      throw new Error(`Failed to load markdown: ${response.statusText}`);
    }
    
    let markdown = await response.readText ? await response.readText() : await response.text();
    
    // Strip YAML Front Matter if present
    markdown = markdown.replace(/^---[\s\S]*?---\s*/, '');

    // Calculate reading time
    postMetaReadingTime.textContent = calculateReadingTime(markdown);

    // Parse and render MD to HTML using marked
    const renderedHtml = marked.parse(markdown);
    
    // Clean up duplicate title if the markdown already contains it as the first header
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderedHtml;
    
    const firstHeader = tempDiv.querySelector('h1, h2');
    if (firstHeader && (firstHeader === tempDiv.firstElementChild || tempDiv.firstElementChild.contains(firstHeader))) {
      const headerText = firstHeader.textContent.trim().toLowerCase();
      const metaTitle = postMeta.title.trim().toLowerCase();
      if (headerText === metaTitle || metaTitle.includes(headerText) || headerText.includes(metaTitle)) {
        firstHeader.remove();
      }
    }

    postContent.innerHTML = tempDiv.innerHTML;
    
    // Render LaTeX equations using KaTeX auto-renderer
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(postContent, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
    
    // Trigger Prism syntax highlighting
    Prism.highlightAllUnder(postContent);
    
    // Refresh Lucide icons inside content if any
    lucide.createIcons();
    
    // Update initial scroll bar state
    updateReadingProgress();
    
  } catch (error) {
    console.error('Error fetching/rendering post:', error);
    postContent.innerHTML = `
      <div class="loader-container">
        <i data-lucide="alert-circle" style="color: var(--accent-color); width: 40px; height: 40px;"></i>
        <h3>Failed to display content</h3>
        <p>Could not fetch the source article from '${postMeta.file}'.</p>
      </div>
    `;
    lucide.createIcons();
  }
}

// Display 404 state
function show404Post() {
  document.body.classList.add('reading-mode');
  
  homeView.classList.remove('active');
  homeView.classList.add('hidden');
  postView.classList.add('active');
  postView.classList.remove('hidden');
  
  postTitle.textContent = "Article Not Found";
  postMetaDate.textContent = "";
  postMetaReadingTime.textContent = "";
  postTags.innerHTML = "";
  
  postContent.innerHTML = `
    <div class="loader-container">
      <i data-lucide="help-circle" style="color: var(--accent-color); width: 48px; height: 48px;"></i>
      <h3>We couldn't locate this piece</h3>
      <p>The link might be outdated or the page has moved.</p>
      <a href="#" class="btn btn-primary" style="text-decoration: none; margin-top: 1rem;">Back to Home</a>
    </div>
  `;
  lucide.createIcons();
  window.scrollTo(0, 0);
}

// Calculate scroll progression relative to article content height
function updateReadingProgress() {
  if (postView.classList.contains('active')) {
    const article = document.querySelector('.single-post');
    if (!article) return;
    
    const rect = article.getBoundingClientRect();
    const scrollTop = -rect.top;
    const articleHeight = rect.height - window.innerHeight;
    
    let progress = 0;
    if (articleHeight > 0 && scrollTop > 0) {
      progress = Math.min(100, (scrollTop / articleHeight) * 100);
    }
    
    readingProgress.style.width = `${progress}%`;
  } else {
    readingProgress.style.width = '0%';
  }
}

// Start App
window.addEventListener('DOMContentLoaded', init);
