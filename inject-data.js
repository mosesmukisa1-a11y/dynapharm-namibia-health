// Dynapharm Data Injection Script
// This script will inject your local data directly into the deployed system

const LOCAL_DATA = {
    clients: [
        // Your clients data will be inserted here
    ],
    users: [
        {
            "id": "USR001",
            "username": "admin",
            "password": "walker33",
            "fullName": "Administrator",
            "email": "admin@dynapharm.com.na",
            "phone": "061-300877",
            "role": "admin",
            "branch": "townshop",
            "branches": ["townshop"]
        },
        {
            "id": "USR1759829667953",
            "username": "moses",
            "password": "walker33",
            "fullName": "MOSES MUKISA",
            "email": "mosesmukisa1@gmail.com",
            "phone": "0817317160",
            "role": "consultant",
            "branch": "townshop",
            "branches": ["townshop", "khomasdal", "katima", "outapi", "ondangwa", "okongo", "okahao", "nkurenkuru", "swakopmund", "hochland-park", "rundu", "gobabis", "walvisbay", "eenhana", "otjiwarongo"],
            "createdAt": "2025-10-07T09:34:27.953Z"
        },
        {
            "id": "USR1759829814781",
            "username": "Geneva",
            "password": "Pearl_11",
            "fullName": "Jennifer Joseph",
            "email": "shange1124@gmail.com",
            "phone": "0852803618",
            "role": "consultant",
            "branch": "townshop",
            "branches": ["townshop", "khomasdal", "katima", "outapi", "ondangwa", "okongo", "okahao", "nkurenkuru", "swakopmund", "hochland-park", "rundu", "gobabis", "walvisbay", "eenhana", "otjiwarongo"],
            "createdAt": "2025-10-07T09:36:54.781Z"
        },
        {
            "id": "USR1759830625722",
            "username": "NAEM",
            "password": "PASSWORD",
            "fullName": "NAEM HANGULA",
            "email": "naemhangula4@gmail.com",
            "phone": "0817499757",
            "role": "dispenser",
            "branch": "townshop",
            "branches": ["townshop"],
            "createdAt": "2025-10-07T09:50:25.722Z"
        },
        {
            "id": "USR1759928153488",
            "username": "GEINGOS",
            "password": "ALBERTO99",
            "fullName": "HILMA C",
            "email": "geingoshilma@gmail",
            "phone": "0814137106",
            "role": "consultant",
            "branch": "townshop",
            "branches": ["townshop", "khomasdal", "katima", "outapi", "ondangwa", "okongo", "okahao", "nkurenkuru", "swakopmund", "hochland-park", "rundu", "gobabis", "walvisbay", "eenhana", "otjiwarongo"],
            "createdAt": "2025-10-08T12:55:53.488Z"
        }
    ],
    branches: [
        {"id": "townshop", "name": "TOWNSHOP (Head Office)", "location": "Shop No.1 Continental Building Independence Avenue - Windhoek", "phone": "814683999"},
        {"id": "khomasdal", "name": "KHOMASDAL DPC", "location": "Shop No.2 Khomasdal Funky Town - Windhoek", "phone": "814682991"},
        {"id": "katima", "name": "KATIMA DPC", "location": "Opposite Open Market Hospital Road, Katima", "phone": "817375818"},
        {"id": "outapi", "name": "OUTAPI DPC", "location": "Okasilili Location in Christmas Building, Next Tolemeka Garage Main Road Oshakati - Outapi", "phone": "814685886"},
        {"id": "ondangwa", "name": "ONDANGWA DPC", "location": "Shop No.3 Woerman Block Oluno, Opposite Fresco, Cash and Carry Entrance Ondangwa", "phone": "814685882"},
        {"id": "okongo", "name": "OKONGO DPC", "location": "Handongo Festus Erf 333 Okongo Village Council", "phone": "814684935"},
        {"id": "okahao", "name": "OKAHAO DPC", "location": "Iteka complex opposite Pep store Okahao - Oshakati main road", "phone": "814683963"},
        {"id": "nkurenkuru", "name": "NKURENKURU DPC", "location": "Total Service Station, Next to Oluno Bar - Nkurenkuru", "phone": "814684939"},
        {"id": "swakopmund", "name": "SWAKOPMUND DPC", "location": "Opposite Mondesa Usave Swakopmund", "phone": "814686806"},
        {"id": "hochland-park", "name": "HOCHLAND PARK", "location": "House No.2 Robin Road, Taubern Glain Street, Next to OK Food Windhoek", "phone": "813207195"},
        {"id": "rundu", "name": "RUNDU DPC", "location": "Shop No.6 Fish Building opposite, Dr. Romanus Kampungi Stadium", "phone": "814050125"},
        {"id": "gobabis", "name": "GOBABIS", "location": "Shop No. Church Street Woerman Complex Gobabis", "phone": "814685905"},
        {"id": "walvisbay", "name": "WALVISBAY", "location": "Shop No.6 Pelican Mall Shop Sam Nujoma Avenue", "phone": "814685894"},
        {"id": "eenhana", "name": "EENHANA", "location": "Shop No.3 Tangi Complex, Next to Namibia Funeral Supply, Dimo Amaambo Street Eenhana", "phone": "814682049"},
        {"id": "otjiwarongo", "name": "OTJIWARONGO DPC", "location": "Erindi Complex next to Spar", "phone": "814681997"}
    ],
    reports: []
};

// Function to inject data into localStorage
function injectData() {
    try {
        // Store data in localStorage
        localStorage.setItem('dynapharm_clients', JSON.stringify(LOCAL_DATA.clients));
        localStorage.setItem('dynapharm_users', JSON.stringify(LOCAL_DATA.users));
        localStorage.setItem('dynapharm_branches', JSON.stringify(LOCAL_DATA.branches));
        localStorage.setItem('dynapharm_reports', JSON.stringify(LOCAL_DATA.reports));
        
        console.log('✅ Data injected successfully!');
        console.log(`📊 Clients: ${LOCAL_DATA.clients.length}`);
        console.log(`👥 Users: ${LOCAL_DATA.users.length}`);
        console.log(`🏢 Branches: ${LOCAL_DATA.branches.length}`);
        console.log(`📋 Reports: ${LOCAL_DATA.reports.length}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error injecting data:', error);
        return false;
    }
}

// Function to verify data injection
function verifyData() {
    try {
        const clients = JSON.parse(localStorage.getItem('dynapharm_clients') || '[]');
        const users = JSON.parse(localStorage.getItem('dynapharm_users') || '[]');
        const branches = JSON.parse(localStorage.getItem('dynapharm_branches') || '[]');
        const reports = JSON.parse(localStorage.getItem('dynapharm_reports') || '[]');
        
        console.log('📊 Data Verification:');
        console.log(`Clients: ${clients.length}`);
        console.log(`Users: ${users.length}`);
        console.log(`Branches: ${branches.length}`);
        console.log(`Reports: ${reports.length}`);
        
        return {
            clients: clients.length,
            users: users.length,
            branches: branches.length,
            reports: reports.length
        };
    } catch (error) {
        console.error('❌ Error verifying data:', error);
        return null;
    }
}

// Auto-inject data when script loads
if (typeof window !== 'undefined') {
    console.log('🚀 Dynapharm Data Injection Script Loaded');
    console.log('💾 Auto-injecting data...');
    
    if (injectData()) {
        console.log('✅ Data injection completed successfully!');
        console.log('🔄 Refreshing page to apply changes...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

// Export functions for manual use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { injectData, verifyData, LOCAL_DATA };
}
