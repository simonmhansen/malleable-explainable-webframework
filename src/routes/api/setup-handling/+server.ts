import { writeFileSync, readFileSync } from 'fs';

export async function POST({ request }) {
    const data = await request.json();
    writeFileSync('savefile.json', JSON.stringify(data))

    return new Response("Setup saved successfully!");    
};

export async function GET({ request }) {

    let savesetup = readFileSync('savefile.json', 'utf-8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        return data;
    });

    return new Response(savesetup);
}