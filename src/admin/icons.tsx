import type { FC } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Add01Icon, Agreement01Icon, Album01Icon, Alert02Icon, AlertCircleIcon, ArrowDown01Icon, ArrowDownRight01Icon,
  ArrowLeft01Icon, ArrowLeft02Icon, ArrowRight01Icon, ArrowRight02Icon, ArrowUpRight01Icon, BalanceScaleIcon, BarChartIcon,
  BookOpen01Icon, Briefcase01Icon, BubbleChatIcon, Calendar01Icon, Calendar03Icon, CalendarCheckIn01Icon, Call02Icon,
  Camera01Icon, Cancel01Icon, ChartLineData01Icon, CheckListIcon, CheckmarkBadge01Icon, CheckmarkCircle02Icon, ChipIcon,
  CircleIcon, ClapperboardIcon, Clock01Icon, Coins01Icon, ComputerIcon, Copy01Icon, CpuIcon, CubeIcon, CursorPointer01Icon,
  DashboardSquare01Icon, Delete02Icon, Dollar01Icon, DollarCircleIcon, DragDropVerticalIcon, Fan01Icon, File02Icon, FlashIcon,
  FloppyDiskIcon, GraphicCardIcon, HardDriveIcon, HashtagIcon, Heading02Icon, Heading03Icon, HeadphonesIcon, Home01Icon,
  Idea01Icon, IdentityCardIcon, Image01Icon, Image02Icon, ImageNotFound01Icon, InboxIcon, InformationCircleIcon, Invoice01Icon,
  KanbanIcon, Key01Icon, LanguageSkillIcon, LaptopIcon, Layers01Icon, LeftToRightListBulletIcon, LeftToRightListNumberIcon,
  Link01Icon, LinkSquare02Icon, Location01Icon, LockIcon, Login01Icon, MagicWand01Icon, Mail01Icon, MapsIcon, Megaphone01Icon,
  Message01Icon, Money01Icon, Moon02Icon, News01Icon, Note01Icon, Package01Icon, PaintBoardIcon, PaintBrush01Icon, PartyIcon,
  PcCaseIcon, PencilEdit01Icon, PencilEdit02Icon, PercentIcon, PlugIcon, Presentation01Icon, RamMemoryIcon, RefreshIcon,
  Robot01Icon, Rocket01Icon, Search01Icon, SecurityBlockIcon, SecurityCheckIcon, SentIcon, ShapesIcon, Share08Icon,
  ShoppingBag01Icon, ShoppingBag02Icon, SmartPhone01Icon, SparklesIcon, SquareLock01Icon, StarIcon, Store01Icon, Sun03Icon,
  Tablet01Icon, Tag01Icon, Tag02Icon, TextBoldIcon, TextFontIcon, Tick02Icon, TouchInteraction01Icon, Tv01Icon,
  UnavailableIcon, Upload01Icon, UserAdd01Icon, UserCircleIcon, UserGroupIcon, UserIcon, UserMultiple02Icon, Video01Icon,
  ViewIcon, ViewOffSlashIcon, Wallet01Icon, WarehouseIcon,
} from '@hugeicons/core-free-icons';

/**
 * Admin ikonkalari — **Hugeicons** (stroke rounded, MIT; egasining tanlovi, 2026-11-21). Ekranlar ikonkani shu
 * fayldan nomi bilan oladi (`import { Plus, Trash } from '../icons'`) va oddiy komponentdek chizadi:
 * `<Plus className="size-4" />`. O'lcham — `className` (`size-*`) yoki sukutda `1em`; `weight="bold" | "fill"` —
 * qalinroq chiziq (2), aks holda 1.5. Faqat yulduz va doira `fill`da chindan to'ladi (reyting, belgi).
 * Yangi ikonka = shu ro'yxatga bitta qator. Sidebar (`nav.ts`) Hugeicons ma'lumotini to'g'ridan oladi.
 */
export interface IconProps {
  className?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  size?: number | string;
  color?: string;
  mirrored?: boolean;
  style?: Record<string, string | number>;
  'aria-hidden'?: boolean | 'true';
  'aria-label'?: string;
}
export type Icon = FC<IconProps>;

const SOLID = new Set<IconSvgElement>([StarIcon, CircleIcon]);
const make = (icon: IconSvgElement): Icon => ({ weight, size = '1em', className = '', mirrored: _m, ...rest }) => (
  <HugeiconsIcon
    icon={icon} size={size} strokeWidth={weight === 'bold' || weight === 'fill' ? 2 : 1.5}
    className={weight === 'fill' && SOLID.has(icon) ? `[&_path]:fill-current ${className}` : className}
    {...rest}
  />
);

export const ArrowDownRight = make(ArrowDownRight01Icon);
export const ArrowLeft = make(ArrowLeft02Icon);
export const ArrowRight = make(ArrowRight02Icon);
export const ArrowSquareOut = make(LinkSquare02Icon);
export const ArrowUpRight = make(ArrowUpRight01Icon);
export const ArrowsClockwise = make(RefreshIcon);
export const Article = make(Note01Icon);
export const BookOpen = make(BookOpen01Icon);
export const Briefcase = make(Briefcase01Icon);
export const CalendarBlank = make(Calendar01Icon);
export const CalendarCheck = make(CalendarCheckIn01Icon);
export const CalendarDots = make(Calendar03Icon);
export const Camera = make(Camera01Icon);
export const CaretDown = make(ArrowDown01Icon);
export const CaretLeft = make(ArrowLeft01Icon);
export const CaretRight = make(ArrowRight01Icon);
export const ChartBar = make(BarChartIcon);
export const ChartLineUp = make(ChartLineData01Icon);
export const ChatCircleDots = make(BubbleChatIcon);
export const ChatCircleText = make(BubbleChatIcon);
export const ChatText = make(Message01Icon);
export const Check = make(Tick02Icon);
export const CheckCircle = make(CheckmarkCircle02Icon);
export const Circle = make(CircleIcon);
export const Circuitry = make(ChipIcon);
export const Clock = make(Clock01Icon);
export const Coins = make(Coins01Icon);
export const Confetti = make(PartyIcon);
export const Copy = make(Copy01Icon);
export const Cpu = make(CpuIcon);
export const Cube = make(CubeIcon);
export const CurrencyCircleDollar = make(DollarCircleIcon);
export const CurrencyDollar = make(Dollar01Icon);
export const CursorClick = make(CursorPointer01Icon);
export const Desktop = make(ComputerIcon);
export const DesktopTower = make(PcCaseIcon);
export const DeviceMobile = make(SmartPhone01Icon);
export const DeviceTablet = make(Tablet01Icon);
export const DotsSixVertical = make(DragDropVerticalIcon);
export const EnvelopeSimple = make(Mail01Icon);
export const Eye = make(ViewIcon);
export const EyeSlash = make(ViewOffSlashIcon);
export const Fan = make(Fan01Icon);
export const FileText = make(File02Icon);
export const FilmSlate = make(ClapperboardIcon);
export const FloppyDisk = make(FloppyDiskIcon);
export const GraphicsCard = make(GraphicCardIcon);
export const HandPointing = make(TouchInteraction01Icon);
export const Handshake = make(Agreement01Icon);
export const HardDrive = make(HardDriveIcon);
export const Hash = make(HashtagIcon);
export const Headphones = make(HeadphonesIcon);
export const House = make(Home01Icon);
export const IdentificationCard = make(IdentityCardIcon);
export const Image = make(Image01Icon);
export const ImageBroken = make(ImageNotFound01Icon);
export const ImageSquare = make(Image02Icon);
export const Images = make(Album01Icon);
export const Info = make(InformationCircleIcon);
export const Kanban = make(KanbanIcon);
export const Key = make(Key01Icon);
export const Laptop = make(LaptopIcon);
export const Lightbulb = make(Idea01Icon);
export const Lightning = make(FlashIcon);
export const LinkSimple = make(Link01Icon);
export const ListBullets = make(LeftToRightListBulletIcon);
export const ListChecks = make(CheckListIcon);
export const ListNumbers = make(LeftToRightListNumberIcon);
export const Lock = make(LockIcon);
export const LockSimple = make(SquareLock01Icon);
export const MagicWand = make(MagicWand01Icon);
export const MagnifyingGlass = make(Search01Icon);
export const MapPin = make(Location01Icon);
export const MapTrifold = make(MapsIcon);
export const Megaphone = make(Megaphone01Icon);
export const Memory = make(RamMemoryIcon);
export const Money = make(Money01Icon);
export const Monitor = make(Tv01Icon);
export const Moon = make(Moon02Icon);
export const Newspaper = make(News01Icon);
export const Package = make(Package01Icon);
export const PaintBrush = make(PaintBrush01Icon);
export const Palette = make(PaintBoardIcon);
export const PaperPlaneTilt = make(SentIcon);
export const PencilSimple = make(PencilEdit02Icon);
export const PencilSimpleLine = make(PencilEdit01Icon);
export const Percent = make(PercentIcon);
export const Phone = make(Call02Icon);
export const Plug = make(PlugIcon);
export const Plus = make(Add01Icon);
export const Prohibit = make(UnavailableIcon);
export const Receipt = make(Invoice01Icon);
export const Robot = make(Robot01Icon);
export const RocketLaunch = make(Rocket01Icon);
export const Scales = make(BalanceScaleIcon);
export const SealCheck = make(CheckmarkBadge01Icon);
export const Shapes = make(ShapesIcon);
export const ShareNetwork = make(Share08Icon);
export const ShieldCheck = make(SecurityCheckIcon);
export const ShieldSlash = make(SecurityBlockIcon);
export const ShoppingBag = make(ShoppingBag01Icon);
export const ShoppingBagOpen = make(ShoppingBag02Icon);
export const SignIn = make(Login01Icon);
export const Slideshow = make(Presentation01Icon);
export const Sparkle = make(SparklesIcon);
export const SquaresFour = make(DashboardSquare01Icon);
export const Stack = make(Layers01Icon);
export const Star = make(StarIcon);
export const Storefront = make(Store01Icon);
export const Sun = make(Sun03Icon);
export const Tag = make(Tag01Icon);
export const TagSimple = make(Tag02Icon);
export const TextAa = make(TextFontIcon);
export const TextB = make(TextBoldIcon);
export const TextHThree = make(Heading03Icon);
export const TextHTwo = make(Heading02Icon);
export const Translate = make(LanguageSkillIcon);
export const Trash = make(Delete02Icon);
export const Tray = make(InboxIcon);
export const UploadSimple = make(Upload01Icon);
export const User = make(UserIcon);
export const UserCircle = make(UserCircleIcon);
export const UserPlus = make(UserAdd01Icon);
export const Users = make(UserGroupIcon);
export const UsersThree = make(UserMultiple02Icon);
export const VideoCamera = make(Video01Icon);
export const Wallet = make(Wallet01Icon);
export const Warehouse = make(WarehouseIcon);
export const Warning = make(Alert02Icon);
export const WarningCircle = make(AlertCircleIcon);
export const X = make(Cancel01Icon);
