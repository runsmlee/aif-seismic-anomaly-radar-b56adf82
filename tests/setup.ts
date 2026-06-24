import '@testing-library/jest-dom';

// React 19 act environment flag
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
