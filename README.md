# EscalaFlex

EscalaFlex é uma aplicação web inteligente para gerenciamento de escalas de trabalho, projetada para simplificar a vida de quem trabalha em turnos rotativos.

## Funcionalidades

*   **Configuração de Padrão de Turno:** Defina facilmente o seu padrão de dias de trabalho e dias de folga.
*   **Visualização em Calendário:** Veja a sua escala de trabalho em um calendário claro e intuitivo.
*   **Customização de Dias:** Altere dias específicos para férias, licenças médicas ou outras eventualidades.
*   **Otimização com IA:** Receba sugestões de novos padrões de escala com base nas suas alterações manuais, graças à nossa integração com IA.

## Tech Stack

*   **Next.js:** Framework React para aplicações web modernas.
*   **TypeScript:** Para um código mais robusto e seguro.
*   **Tailwind CSS:** Para uma estilização rápida e customizável.
*   **shadcn/ui e Radix UI:** Para componentes de UI acessíveis e de alta qualidade.
*   **React Hook Form e Zod:** Para uma validação de formulários poderosa e segura.
*   **Genkit AI:** Para a funcionalidade de otimização de escala com IA.
*   **Firebase:** Para armazenamento de dados e autenticação (em desenvolvimento).

## Começando

Para rodar o projeto localmente, siga estes passos:

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/seu-usuario/escalaflex.git
    ```

2.  **Instale as dependências:**

    ```bash
    cd escalaflex
    npm install
    ```

3.  **Configure as variáveis de ambiente:**

    Crie um arquivo `.env.local` na raiz do projeto e adicione as suas chaves do Firebase:

    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=...
    ```

4.  **Rode o servidor de desenvolvimento:**

    ```bash
    npm run dev
    ```

    Abra [http://localhost:9002](http://localhost:9002) no seu navegador para ver a aplicação.

## Contribuindo

Contribuições são bem-vindas! Se você tem alguma ideia para melhorar o EscalaFlex, sinta-se à vontade para abrir uma issue ou enviar um pull request.