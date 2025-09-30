// ตั้งค่า BASE_URL ให้เป็น IP ของคอมพ์คุณในวงแลน (เวลาทดสอบบนมือถือจริงห้ามใช้ localhost)
export const BASE_URL = 'http://192.168.1.155:3001';


export async function apiGet(path) {
    const res = await fetch(`${BASE_URL}${path}`);
    return res.json();
}
export async function apiPost(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
}
export async function apiPatch(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
}
export async function apiDel(path) {
    const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
    return res.ok;
}