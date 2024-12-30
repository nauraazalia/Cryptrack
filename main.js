// Akses Elemen
const watchArea = document.querySelector('#watch-area');
const watchList = document.createElement('div');
const reset = document.querySelector('#reset');
const showGraph = document.querySelector('#show-graph');
const coinArea = document.querySelector('#coin-area');
const coinList = document.createElement('div');
const graphContainer = document.getElementById('get-graph');
const ctx = document.getElementById('myChart').getContext('2d');
const darkModeToggle = document.querySelector('#dark-mode-toggle');
const timeframeButtons = {
    '3hrs': document.getElementById('timeframe-3hrs'),
    '12hrs': document.getElementById('timeframe-12hrs'),
    '24hrs': document.getElementById('timeframe-24hrs')
};
let currentPage = 1;
const itemsPerPage = 10;
// Graph data per coin
const coinDataMap = new Map(); 
let displayedCoinId = null;
let chart;
let updateInterval = null; // Interval for live updates

// Watchlist storage
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let watchlistInterval = null; 
// Fitur Dark Mode
let darkMode = localStorage.getItem('darkMode');

function enableDarkMode() {
    document.body.classList.add('darkmode');
    localStorage.setItem('darkMode', 'enabled');
}

function disableDarkMode() {
    document.body.classList.remove('darkmode');
    localStorage.setItem('darkMode', null);
}

if (darkMode === 'enabled') {
    enableDarkMode();
}

darkModeToggle.addEventListener('click', function() {
    darkMode = localStorage.getItem('darkMode');
    if (darkMode !== 'enabled') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
});
// Fitur Searchbar


// Fetch dan Render Coin
async function myFunction() {
    const httpResponse = await fetch('https://api.coincap.io/v2/assets');
    const data = await httpResponse.json();
    const coins = data.data;
    renderCoins(coins);

    async function updateLiveData(coinId) {
        const coinResponse = await fetch(`https://api.coincap.io/v2/assets/${coinId}`);
        const coin = await coinResponse.json();

        if (coin && coin.data) {
            const liveData = coinDataMap.get(coinId);
            liveData.priceGraph.push(parseFloat(coin.data.priceUsd));
            liveData.timeStamp.push(new Date().toLocaleTimeString());

            // simpan 50 data performace
            if (liveData.priceGraph.length > 50) {
                liveData.priceGraph.shift();
                liveData.timeStamp.shift();
            }

            if (displayedCoinId === coinId) {
                updateChart(liveData.timeStamp, liveData.priceGraph);
            }
        }
    }
    // searchBar
    const searchBar = document.querySelector('#search-bar');
    searchBar.addEventListener('input', function () {
        const query = searchBar.value.toLowerCase(); // Get user input in lowercase
        const filteredCoins = coins.filter(coin => {
            const coinName = coin.name.toLowerCase();
            const coinSymbol = coin.symbol.toLowerCase();
            return coinName.includes(query) || coinSymbol.includes(query);
        });
    
        currentPage = 1; // Reset to the first page to display results
        renderCoins(filteredCoins);
    });

    function renderCoins(coins) {
        coinList.innerHTML = ''; // Clear the coin list
    
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, coins.length);
    
        // Render the coins for the current page
        for (let i = startIndex; i < endIndex; i++) {
            const coin = coins[i];
            const fixedPrice = abbreviate(coin.priceUsd);
            const fixedChange = round(coin.changePercent24Hr);
            const valueColor = fixedChange < 0 ? 'negative' : 'positive';
            const coinIcon = coin.symbol.toLowerCase();
    
            const singleCoin = `
            <div class="coin-detail">
                <img src="https://assets.coincap.io/assets/icons/${coinIcon}@2x.png" class="icon">
                <div class="symbol-name">
                    <div class="coin-title">${coin.name}</div>
                </div>
                <div class="last-price">$${fixedPrice}</div>
                <div class="market-cap">$${abbreviate(coin.marketCapUsd)}</div>
                <div class="supply">${abbreviate(coin.supply)}</div>
                <div class="price-change">
                    <span class="${valueColor}">${fixedChange}%</span>
                </div>
                <div class="coin-buttons">
                    <a href="#graph-anchor"><button class="graph" data-id="${coin.id}" data-name="${coin.name}">Graph</button></a>
                    <a href="#watchlist-anchor"><button class="favorite" data-id="${coin.id}" data-name="${coin.name}" data-price="${fixedPrice}">+</button></a>
                </div>
            </div>`;
            
            coinList.innerHTML += singleCoin;
        }
        coinArea.append(coinList);
        addPaginationControls(coins.length);
    
        attachFavoriteButtonListeners();
        attachGraphButtonListeners(); 
    }
    function attachFavoriteButtonListeners() {
        document.querySelectorAll('.favorite').forEach((button) => {
            button.addEventListener('click', (event) => {
                const coinId = event.target.getAttribute('data-id');
                const coinName = event.target.getAttribute('data-name');
                const coinPrice = event.target.getAttribute('data-price');
    
                // Check if already in watchlist
                if (!watchlist.some(item => item.id === coinId)) {
                    watchlist.push({ id: coinId, name: coinName, price: coinPrice });
                    localStorage.setItem('watchlist', JSON.stringify(watchlist));
                    renderWatchlist();
                }
            });
        });
    }

    function attachGraphButtonListeners() {
        document.querySelectorAll('.graph').forEach((button) => {
            button.addEventListener('click', async (event) => {
                const coinId = event.target.getAttribute('data-id');
                const coinName = event.target.getAttribute('data-name');
    
                displayedCoinId = coinId; // Set the currently displayed coin
    
                if (!coinDataMap.has(coinId)) {
                    await fetchCoinHistory(coinId, 'm1'); // Default to 3-hour interval
                }
    
                const selectedData = coinDataMap.get(coinId);
                document.getElementById('graph-info').textContent = `${coinName} Price History`;
                graphContainer.style.display = 'block';
    
                updateChart(selectedData.timeStamp, selectedData.priceGraph);
    
                if (updateInterval) clearInterval(updateInterval);
                updateInterval = setInterval(() => updateLiveData(coinId), 10000);
            });
        });
    }
// Fitur Pagination
    function addPaginationControls(totalItems) {
        function resetSearchBar() {
            if(searchBar.value) {
                console.log('hi pak')
            }
            searchBar.value = ''
        }
        const paginationControls = document.getElementById('pagination-controls') || document.createElement('div');
        paginationControls.id = 'pagination-controls';
        paginationControls.innerHTML = '';
        paginationControls.style.display = 'flex';
        paginationControls.style.justifyContent = 'center';
        paginationControls.style.marginTop = '20px';
    
        const totalPages = Math.ceil(totalItems / itemsPerPage);
    
        // Previous Button
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderCoins(coins);
            }
        };
        paginationControls.appendChild(prevButton);
    
        // Page Numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.style.margin = '0 5px';
            pageButton.classList.add('pagination-button-reset'); 
            pageButton.disabled = currentPage === i;
            pageButton.onclick = () => {
                resetSearchBar()
                currentPage = i;
                renderCoins(coins);
            };
            paginationControls.appendChild(pageButton);
        }
        
        // Next Button
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderCoins(coins);
            }
        };
        paginationControls.appendChild(nextButton);
    
        coinArea.appendChild(paginationControls);
    }

    // Graph button functionality
    document.querySelectorAll('.graph').forEach((button) => {
        button.addEventListener('click', async (event) => {
            const coinId = event.target.getAttribute('data-id');
            const coinName = event.target.getAttribute('data-name');

            displayedCoinId = coinId; // Set the currently displayed coin

            if (!coinDataMap.has(coinId)) {
                await fetchCoinHistory(coinId, 'm1'); // Default to 3-hour interval
            }

            const selectedData = coinDataMap.get(coinId);
            document.getElementById('graph-info').textContent = `${coinName} Price History`;
            graphContainer.style.display = 'block';

            updateChart(selectedData.timeStamp, selectedData.priceGraph);

            if (updateInterval) clearInterval(updateInterval);
            updateInterval = setInterval(() => updateLiveData(coinId), 10000);
        });
    });

    // Watchlist button functionality
    document.querySelectorAll('.favorite').forEach((button) => {
        button.addEventListener('click', (event) => {

            const coinId = event.target.getAttribute('data-id');
            const coinName = event.target.getAttribute('data-name');
            const coinPrice = event.target.getAttribute('data-price');

            // Check if already in watchlist
            if (!watchlist.some(item => item.id === coinId)) {
                watchlist.push({ id: coinId, name: coinName, price: coinPrice });
                localStorage.setItem('watchlist', JSON.stringify(watchlist));
                renderWatchlist();
            }
        });
    });

    // Render watchlist
    function renderWatchlist() {
        if (!watchArea) return; //watchArea exists

        watchArea.innerHTML = '';
        watchlist.forEach((coin) => {
            const watchItem = `
            <div class="watch-item" style="justify-content: space-between; padding:15px 30px;">
            <span style="font-size: 1.1rem; font-weight: bold;">${coin.name} <br>$<span id="price-${coin.id}" style="color: #31c76d;">${coin.price}</span></span>
            <button class="remove" data-id="${coin.id}" style="background-color: #df4242; color: white; border: none; border-radius: 5px; padding: 5px 10px ;cursor: pointer;">Remove</button> 
            </div>`;
            watchArea.innerHTML += watchItem;
        });

        // Add remove functionality
        document.querySelectorAll('.remove').forEach((button) => {
            button.addEventListener('click', (event) => {
                const coinId = event.target.getAttribute('data-id');
                watchlist = watchlist.filter(item => item.id !== coinId);
                localStorage.setItem('watchlist', JSON.stringify(watchlist));
                renderWatchlist();
            });
        });
    }

    // Live watchlist price updates
    if (watchlistInterval) clearInterval(watchlistInterval);
    watchlistInterval = setInterval(async () => {
        for (const coin of watchlist) {
            const response = await fetch(`https://api.coincap.io/v2/assets/${coin.id}`);
            const data = await response.json();
            if (data && data.data) {
                const livePrice = parseFloat(data.data.priceUsd).toFixed(2);
                document.getElementById(`price-${coin.id}`).textContent = livePrice;
                coin.price = livePrice; // Update local watchlist price
            }
        }
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }, 10000);

    // Reset watchlist
    reset.addEventListener('click', () => {
        watchlist = [];
        localStorage.removeItem('watchlist');
        renderWatchlist();
    });

    // Initial render of watchlist
    renderWatchlist();

    // Attach timeframe button functionality
    Object.keys(timeframeButtons).forEach((timeframe) => {
        timeframeButtons[timeframe].addEventListener('click', async () => {
            if (displayedCoinId) {
                const interval = convertTimeframeToInterval(timeframe);
                await fetchCoinHistory(displayedCoinId, interval);

                const selectedData = coinDataMap.get(displayedCoinId);
                updateChart(selectedData.timeStamp, selectedData.priceGraph);
            }
        });
    });

    // Initialize chart
    if (!chart) {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price (USD)',
                    data: [],
                    borderColor: '#31c76d',
                    backgroundColor: 'rgba(49, 199, 109, 0.2)',
                    tension: 0.4,
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Time' } },
                    y: { title: { display: true, text: 'Price (USD)' } }
                }
            }
        });
    }

    // Function to fetch coin history for a given interval
    async function fetchCoinHistory(coinId, interval) {
        const coinResponse = await fetch(`https://api.coincap.io/v2/assets/${coinId}/history?interval=${interval}`);
        const coinData = await coinResponse.json();

        const priceGraph = [];
        const timeStamp = [];

        coinData.data.forEach((entry) => {
            priceGraph.push(parseFloat(entry.priceUsd));
            timeStamp.push(new Date(entry.time).toLocaleTimeString());
        });

        coinDataMap.set(coinId, { priceGraph, timeStamp });
    }

    // Convert timeframe to API interval
    function convertTimeframeToInterval(timeframe) {
        switch (timeframe) {
            case '3hrs':
                return 'm1';
            case '12hrs':
                return 'm5';
            case '24hrs':
                return 'm15';
            default:
                return 'h1';
        }
    }

    // Function to update chart
    function updateChart(labels, data) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }
}

myFunction();

// Utility functions
function round(num, precision = 2) {
    const prec = Math.pow(10, precision);
    return Math.round(num * prec) / prec;
}

function abbreviate(num) {
    const abbr = ['k', 'm', 'b', 't'];
    const base = Math.floor(Math.log(Math.abs(num)) / Math.log(1000));
    const suffix = abbr[Math.min(3, base - 1)];
    return suffix ? round(num / Math.pow(1000, base), 2) + suffix : '' + num;
}
