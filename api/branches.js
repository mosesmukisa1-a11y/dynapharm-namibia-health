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
    
    // Load branches from cloud-data/data.json
    if (!global.branches || global.branches.length === 0) {
        try {
            const dataFilePath = path.join(process.cwd(), 'cloud-data', 'data.json');
            if (fs.existsSync(dataFilePath)) {
                const dataContent = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
                global.branches = dataContent.branches || [];
                console.log(`✅ Loaded ${global.branches.length} branches from cloud-data/data.json`);
            }
            
            // Fallback to default branches if none loaded
            if (!global.branches || global.branches.length === 0) {
                global.branches = [
                    {"id":"townshop","name":"TOWNSHOP (Head Office)","location":"Shop No.1 Continental Building Independence Avenue - Windhoek","phone":"814683999"},
                    {"id":"khomasdal","name":"KHOMASDAL DPC","location":"Shop No.2 Khomasdal Funky Town - Windhoek","phone":"814682991"},
                    {"id":"katima","name":"KATIMA DPC","location":"Opposite Open Market Hospital Road, Katima","phone":"817375818"},
                    {"id":"outapi","name":"OUTAPI DPC","location":"Okasilili Location in Christmas Building, Next Tolemeka Garage Main Road Oshakati - Outapi","phone":"814685886"},
                    {"id":"ondangwa","name":"ONDANGWA DPC","location":"Shop No.3 Woerman Block Oluno, Opposite Fresco, Cash and Carry Entrance Ondangwa","phone":"814685882"},
                    {"id":"okongo","name":"OKONGO DPC","location":"Handongo Festus Erf 333 Okongo Village Council","phone":"814684935"},
                    {"id":"okahao","name":"OKAHAO DPC","location":"Iteka complex opposite Pep store Okahao - Oshakati main road","phone":"814683963"},
                    {"id":"nkurenkuru","name":"NKURENKURU DPC","location":"Total Service Station, Next to Oluno Bar - Nkurenkuru","phone":"814684939"},
                    {"id":"swakopmund","name":"SWAKOPMUND DPC","location":"Opposite Mondesa Usave Swakopmund","phone":"814686806"},
                    {"id":"hochland-park","name":"HOCHLAND PARK","location":"House No.2 Robin Road, Taubern Glain Street, Next to OK Food Windhoek","phone":"813207195"},
                    {"id":"rundu","name":"RUNDU DPC","location":"Shop No.1 Rundu Shopping Complex Rundu","phone":"814687858"},
                    {"id":"gobabis","name":"GOBABIS DPC","location":"Shop No.1 Opposite Gobabis Medical Centre Main Road Gobabis","phone":"814688868"},
                    {"id":"walvisbay","name":"WALVIS BAY DPC","location":"Shop No.7 Mondesa Centre - Opposite Usave Walvis Bay","phone":"814686840"},
                    {"id":"eenhana","name":"EENHANA DPC","location":"Shop No.2 Next to Nampost Eenhana Main Road","phone":"814685870"},
                    {"id":"otjiwarongo","name":"OTJIWARONGO DPC","location":"Shop No.4 Opposite Biltong Shop Otjiwarongo Main Road","phone":"814686815"}
                ];
                console.log(`✅ Loaded ${global.branches.length} default branches`);
            }
        } catch (error) {
            console.error('❌ Error loading branches:', error);
            // Use default branches on error
            global.branches = [
                {"id":"townshop","name":"TOWNSHOP (Head Office)","location":"Shop No.1 Continental Building Independence Avenue - Windhoek","phone":"814683999"},
                {"id":"khomasdal","name":"KHOMASDAL DPC","location":"Shop No.2 Khomasdal Funky Town - Windhoek","phone":"814682991"},
                {"id":"katima","name":"KATIMA DPC","location":"Opposite Open Market Hospital Road, Katima","phone":"817375818"},
                {"id":"outapi","name":"OUTAPI DPC","location":"Okasilili Location in Christmas Building, Next Tolemeka Garage Main Road Oshakati - Outapi","phone":"814685886"},
                {"id":"ondangwa","name":"ONDANGWA DPC","location":"Shop No.3 Woerman Block Oluno, Opposite Fresco, Cash and Carry Entrance Ondangwa","phone":"814685882"},
                {"id":"okongo","name":"OKONGO DPC","location":"Handongo Festus Erf 333 Okongo Village Council","phone":"814684935"},
                {"id":"okahao","name":"OKAHAO DPC","location":"Iteka complex opposite Pep store Okahao - Oshakati main road","phone":"814683963"},
                {"id":"nkurenkuru","name":"NKURENKURU DPC","location":"Total Service Station, Next to Oluno Bar - Nkurenkuru","phone":"814684939"},
                {"id":"swakopmund","name":"SWAKOPMUND DPC","location":"Opposite Mondesa Usave Swakopmund","phone":"814686806"},
                {"id":"hochland-park","name":"HOCHLAND PARK","location":"House No.2 Robin Road, Taubern Glain Street, Next to OK Food Windhoek","phone":"813207195"},
                {"id":"rundu","name":"RUNDU DPC","location":"Shop No.1 Rundu Shopping Complex Rundu","phone":"814687858"},
                {"id":"gobabis","name":"GOBABIS DPC","location":"Shop No.1 Opposite Gobabis Medical Centre Main Road Gobabis","phone":"814688868"},
                {"id":"walvisbay","name":"WALVIS BAY DPC","location":"Shop No.7 Mondesa Centre - Opposite Usave Walvis Bay","phone":"814686840"},
                {"id":"eenhana","name":"EENHANA DPC","location":"Shop No.2 Next to Nampost Eenhana Main Road","phone":"814685870"},
                {"id":"otjiwarongo","name":"OTJIWARONGO DPC","location":"Shop No.4 Opposite Biltong Shop Otjiwarongo Main Road","phone":"814686815"}
            ];
        }
    }
    
    if (req.method === 'GET') {
        res.status(200).json(global.branches);
    } else if (req.method === 'POST') {
        const newBranch = {
            ...req.body,
            // Ensure required fields
            id: req.body.id || `branch_${Date.now()}`,
            created_at: new Date().toISOString()
        };
        global.branches.push(newBranch);
        res.status(201).json(newBranch);
    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        const branchIndex = global.branches.findIndex(b => b.id === id);
        if (branchIndex !== -1) {
            global.branches.splice(branchIndex, 1);
            res.status(200).json({ message: 'Branch deleted' });
        } else {
            res.status(404).json({ error: 'Branch not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
