// utils/dayjs.js
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone'; // Nếu cần đổi múi giờ
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi'; // Nếu muốn tiếng Việt

// Mở rộng plugin
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('vi'); // Đặt ngôn ngữ tiếng Việt

export default dayjs;