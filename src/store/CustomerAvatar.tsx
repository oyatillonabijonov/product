import type { FC } from 'react';
import { BotAvatar } from 'bot-avatars';
import type { Avatar } from '../../shared/avatar';

/** Mijoz avatari: yuklangan rasm bo'lsa — o'sha (doira), aks holda `bot-avatars` shakli. */
const CustomerAvatar: FC<{ avatar: Avatar; size: number; interactive?: boolean }> = ({ avatar, size, interactive }) =>
  avatar.photo ? (
    <img src={avatar.photo} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-full border border-line object-cover" />
  ) : (
    <BotAvatar type={avatar.type} face={avatar.face} size={size} interactive={interactive} />
  );

export default CustomerAvatar;
