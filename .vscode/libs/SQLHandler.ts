import { DB } from "https://deno.land/x/sqlite/mod.ts";

const db = new DB("game.db");


export function getUsers(db: DB) {
    const users = [{id: 9999, username: 'Batman', password_hash: 'au pif'}];

    // Exécuter la requête SQL
    const results = db.query(`SELECT id, username, password_hash FROM users`);
    results.forEach((element) => {
        const user = {id: element[0], username: element[1], password_hash: element[2]}
        users.push(user)
    })
    return users
}


