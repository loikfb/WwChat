import * as z from 'zod';

import { instance } from '@/services/instance';

import { userSchema } from './schema';

export const UserServices = {
  fetchAll: async (): Promise<z.infer<typeof userSchema>[]> => {
    const response = await instance.get('users').json();
    return z.array(userSchema).parse(response);
  },

  fetchOne: async (id: string): Promise<z.infer<typeof userSchema>> => {
    const response = await instance.get(`users/${id}`).json();
    return userSchema.parse(response);
  },
};
