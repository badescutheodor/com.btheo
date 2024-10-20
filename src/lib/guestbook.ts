import { getDB } from '@/lib/db';
import { GuestbookEntry } from '@/lib/entities/GuestbookEntry';
import EntityValidator from './entities/EntityValidator';

export const createGuestbook = async (data = {}) => {
    'use server';
    const db = await getDB();
    const guestbookRepository = db.getRepository(GuestbookEntry); 

    const entry = guestbookRepository.create(data);
    const errors = await EntityValidator.validate(entry, GuestbookEntry);

    if (Object.keys(errors).length) {
        return { errors };
    }

    guestbookRepository.save(entry);
    return { success: true };
}