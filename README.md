# PIDB Kanban Example

This repository is a demo for the main package [`@prisma-idb/idb-client-generator`](https://www.npmjs.com/package/@prisma-idb/idb-client-generator). It showcases how to utilize it, allowing for fast offline, structured, and a Prisma ORM-like DX.

## Features

- **Svelte**: A modern JavaScript framework for building user interfaces.
- **Prisma**: A next-generation ORM for Node.js and TypeScript.
- **IndexedDB**: A low-level API for client-side storage of significant amounts of structured data.
- **Vite**: A fast build tool for modern web projects.

## Getting Started

### Prerequisites

- Node.js (>= 14.x)
- npm (>= 6.x)

### Installation

1. Clone the repository:

  ```sh
  git clone https://github.com/prisma-idb/pidb-kanban-example.git
  cd pidb-kanban-example
  ```

2. Install the dependencies:

  ```sh
  npm install
  ```

3. Generate the Prisma client:

  ```sh
  npx prisma generate
  ```

### Running the Application

- **Development mode**:

  ```sh
  npm run dev
  ```

- **Build for production**:

  ```sh
  npm run build
  ```

- **Preview the production build**:

  ```sh
  npm run preview
  ```

### Testing

- **Run end-to-end tests**:

  ```sh
  npm run test:e2e
  ```

## Project Structure

- `src/`: Contains the source code of the application.
- `prisma/`: Contains the Prisma schema and migration files.
- `public/`: Contains static assets.

## Learn More

- [idb-client-generator](https://github.com/prisma-idb/idb-client-generator)
- [Svelte Documentation](https://svelte.dev/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Vite Documentation](https://vitejs.dev/guide/)

## License

This project is licensed under the MIT License.