import { DefaultValue } from 'recoil';
import { storage } from '../../lib/storage';

export const persistAtom = <T>(key: string, defaultValue: T) => ({
  key,
  default: storage.get(key, defaultValue),
  effects: [
    ({ setSelf, onSet }: any) => {
      const savedValue = storage.get(key, new DefaultValue());
      if (savedValue instanceof DefaultValue) {
        setSelf(defaultValue);
      } else {
        setSelf(savedValue);
      }

      onSet((newValue: T) => {
        if (newValue instanceof DefaultValue) {
          storage.remove(key);
        } else {
          storage.set(key, newValue);
        }
      });
    },
  ],
});