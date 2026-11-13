import { AVATAR_MAX_BYTES, avatarFileError } from './avatar';

describe('avatarFileError', () => {
  it('accepts jpg, png and webp images up to 5 MB', () => {
    expect(avatarFileError({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(avatarFileError({ type: 'image/png', size: AVATAR_MAX_BYTES })).toBeNull();
    expect(avatarFileError({ type: 'image/webp', size: 1 })).toBeNull();
  });

  it('rejects other formats', () => {
    expect(avatarFileError({ type: 'image/gif', size: 1024 })).toBe('avatar_type');
    expect(avatarFileError({ type: 'application/pdf', size: 1024 })).toBe('avatar_type');
  });

  it('rejects images over 5 MB', () => {
    expect(avatarFileError({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toBe('avatar_size');
  });
});
