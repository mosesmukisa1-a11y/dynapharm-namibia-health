import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Load users from inject-data.js file
    if (!global.users || global.users.length === 0) {
        try {
            const injectDataPath = path.join(process.cwd(), 'inject-data.js');
            if (fs.existsSync(injectDataPath)) {
                const fileContent = fs.readFileSync(injectDataPath, 'utf8');
                
                // Extract users array from the file
                const usersMatch = fileContent.match(/users:\s*\[(.*?)\]/s);
                if (usersMatch) {
                    // Try to extract the users using a safer method
                    const usersStart = fileContent.indexOf('users: [');  
                    const usersEnd = fileContent.indexOf('],', usersStart);
                    if (usersStart !== -1 && usersEnd !== -1) {
                        const usersSection = fileContent.substring(usersStart + 8, usersEnd + 1);
                        // Clean up the users data
                        global.users = JSON.parse(usersSection);
                        console.log(`✅ Loaded ${global.users.length} users from inject-data.js`);
                    }
                }
                
                // Fallback: Use the known users from inject-data.js
                if (!global.users || global.users.length === 0) {
                    global.users = [
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
                    ];
                    console.log(`✅ Loaded ${global.users.length} default users`);
                }
            } else {
                console.log('⚠️ inject-data.js not found, using default users');
                // Use default users if file not found
                global.users = [
                    {
                        "id": "USR001",
                        "username": "admin",
                        "password": "walker33",
                        "fullName": "Administrator",
                        "email": "admin@dynapharm.com.na",
                        "phone": "061-300877",
                        "role": "admin",
                        "branch": "townshop"
                    }
                ];
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            // Fallback to default users
            global.users = [
                {
                    "id": "USR001",
                    "username": "admin",
                    "password": "walker33",
                    "fullName": "Administrator",
                    "email": "admin@dynapharm.com.na",
                    "phone": "061-300877",
                    "role": "admin",
                    "branch": "townshop"
                }
            ];
        }
    }
    
    if (req.method === 'GET') {
        res.status(200).json(global.users);
    } else if (req.method === 'POST') {
        const newUser = {
            id: global.users.length + 1,
            ...req.body,
            created_at: new Date().toISOString()
        };
        global.users.push(newUser);
        res.status(201).json(newUser);
    } else if (req.method === 'PUT') {
        const { id, ...updateData } = req.body;
        const userIndex = global.users.findIndex(u => u.id === parseInt(id));
        if (userIndex !== -1) {
            global.users[userIndex] = { ...global.users[userIndex], ...updateData };
            res.status(200).json(global.users[userIndex]);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        const userIndex = global.users.findIndex(u => u.id === parseInt(id));
        if (userIndex !== -1) {
            global.users.splice(userIndex, 1);
            res.status(200).json({ message: 'User deleted' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
