// Main JavaScript file for Meeplewood

// Router configuration
const router = {
    currentRoute: 'dashboard',
    
    routes: {
        dashboard: {
            title: 'Dashboard',
            render: async function() {
                try {
                    const response = await fetch('pages/dashboard.html');
                    const html = await response.text();
                    return html;
                } catch (error) {
                    console.error('Error loading dashboard page:', error);
                    return '<h1>Error loading dashboard</h1>';
                }
            }
        },
        
        games: {
            title: 'Games Library',
            render: async function() {
                // Load external HTML file
                try {
                    const response = await fetch('pages/games.html');
                    const html = await response.text();
                    return html;
                } catch (error) {
                    console.error('Error loading games page:', error);
                    return '<h1>Error loading games page</h1><p>Could not load games.html</p>';
                }
            }
        },
        
        stats: {
            title: 'Statistics',
            render: async function() {
                try {
                    const response = await fetch('pages/stats.html');
                    const html = await response.text();
                    return html;
                } catch (error) {
                    console.error('Error loading stats page:', error);
                    return '<h1>Error loading stats page</h1>';
                }
            }
        },
        
        groups: {
            title: 'Gaming Groups',
            render: async function() {
                try {
                    const response = await fetch('pages/groups.html');
                    const html = await response.text();
                    return html;
                } catch (error) {
                    console.error('Error loading groups page:', error);
                    return '<h1>Error loading groups page</h1>';
                }
            }
        },
        
        settings: {
            title: 'Settings',
            render: async function() {
                try {
                    const response = await fetch('pages/settings.html');
                    const html = await response.text();
                    return html;
                } catch (error) {
                    console.error('Error loading settings page:', error);
                    return '<h1>Error loading settings page</h1>';
                }
            }
        },
        
        'geek-preview': {
            title: 'Geek Preview',
            render: async function() {
                try {
                    const response = await fetch('pages/geek-preview.html');
                    const html = await response.text();
                    return html;
                } catch (error) {
                    console.error('Error loading geek-preview page:', error);
                    return '<h1>Error loading geek-preview page</h1>';
                }
            }
        }
    },
    
    navigate: function(routeName) {
        if (this.routes[routeName]) {
            this.currentRoute = routeName;
            this.render();
            console.log(`Navigated to: ${routeName}`);
        } else {
            console.error(`Route not found: ${routeName}`);
        }
    },
    
    render: async function() {
        const mainContent = document.getElementById('mainContent');
        const route = this.routes[this.currentRoute];
        
        if (mainContent && route) {
            const content = await route.render();
            mainContent.innerHTML = content;
            document.title = `Meeplewood - ${route.title}`;
            
            // Initialize any page-specific functionality
            this.initCurrentPage();
        }
    },
    
    initCurrentPage: function() {
        // Add event listeners for current page elements
        if (this.currentRoute === 'dashboard' && typeof DashboardPage !== 'undefined') {
            DashboardPage.init();
        } else if (this.currentRoute === 'games' && typeof GamesPage !== 'undefined') {
            GamesPage.init();
        } else if (this.currentRoute === 'stats' && typeof StatsPage !== 'undefined') {
            StatsPage.init();
        } else if (this.currentRoute === 'groups' && typeof GroupsPage !== 'undefined') {
            GroupsPage.init();
        } else if (this.currentRoute === 'settings' && typeof SettingsPage !== 'undefined') {
            SettingsPage.init();
        } else if (this.currentRoute === 'geek-preview' && typeof GeekPreviewPage !== 'undefined') {
            GeekPreviewPage.init();
        }
    }
};

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Meeplewood application loaded');
    
    // Banner navigation functionality
    const navButtons = document.querySelectorAll('.nav-button');
    const settingsButton = document.getElementById('settingsButton');
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const bannerNav = document.getElementById('bannerNav');

    function closeMobileNav() {
        if (!bannerNav || !mobileNavToggle) {
            return;
        }

        bannerNav.classList.remove('is-open');
        mobileNavToggle.setAttribute('aria-expanded', 'false');
        mobileNavToggle.textContent = '☰';
    }

    if (mobileNavToggle && bannerNav) {
        mobileNavToggle.addEventListener('click', function() {
            const isOpen = bannerNav.classList.toggle('is-open');
            mobileNavToggle.setAttribute('aria-expanded', String(isOpen));
            mobileNavToggle.textContent = isOpen ? '✕' : '☰';
        });
    }
    
    // Handle navigation button clicks
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            navButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get route from data attribute
            const route = this.getAttribute('data-route');
            // Just update the hash - let hashchange event handle navigation
            window.location.hash = route;
            closeMobileNav();
        });
    });
    
    // Handle settings button click
    settingsButton.addEventListener('click', function() {
        console.log('Settings button clicked');
        // Just update the hash - let hashchange event handle navigation
        window.location.hash = 'settings';
    });
    
    // Handle browser back/forward buttons and hash changes
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.substring(1);
        if (hash && router.routes[hash]) {
            router.navigate(hash);
            closeMobileNav();
            
            // Update active nav button
            navButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-route') === hash) {
                    btn.classList.add('active');
                }
            });
        }
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth > 600) {
            closeMobileNav();
        }
    });
    
    // Load initial route
    const initialHash = window.location.hash.substring(1);
    const initialRoute = initialHash && router.routes[initialHash] ? initialHash : 'dashboard';
    
    // Set initial active button
    navButtons.forEach(btn => {
        if (btn.getAttribute('data-route') === initialRoute) {
            btn.classList.add('active');
        }
    });
    
    // Navigate to initial route
    // If there's no hash or it needs to change, setting hash will trigger hashchange event
    // If hash is already correct, we need to navigate manually
    const currentHash = window.location.hash.substring(1);
    if (currentHash === initialRoute) {
        // Hash already set, navigate directly (won't trigger hashchange)
        router.navigate(initialRoute);
    } else {
        // Setting hash will trigger hashchange event, which will navigate
        window.location.hash = initialRoute;
    }
});

// Example function
function greet(name) {
    return `Hello, ${name}! Welcome to Meeplewood.`;
}

// You can test the function in console
console.log(greet('Player'));
