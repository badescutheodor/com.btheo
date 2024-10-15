import { getDB } from '@/lib/db';
import { GuestbookEntry } from '@/lib/entities/GuestbookEntry';

export const createGuestbook = async (data = {}) => {
    'use server';
    const db = await getDB();
    const guestbookRepository = db.getRepository(GuestbookEntry); 
    data.createdAt = new Date();

    const entry = guestbookRepository.create(data);
    const errors = await GuestbookEntry.validate(entry);

    if (Object.keys(errors).length > 0) {
        return errors;
    }

    guestbookRepository.save(entry);
    return { success: true };
}