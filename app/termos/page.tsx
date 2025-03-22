// app/termos/page.tsx
"use client";

import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Termos e Condições de Uso - Traders House",
  description:
    "Termos e Condições de Uso e Política de Privacidade da Traders House",
};

export default function TermsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <Card className="shadow-md">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Termos e Condições de Uso e Política de Privacidade
          </h1>
          <Separator className="my-6" />

          <ScrollArea className="h-[70vh] pr-4">
            <div className="prose max-w-none p-2">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Introdução</h2>
                <p className="text-gray-700">
                  Nosso compromisso é garantir a proteção e a privacidade dos
                  dados pessoais de nossos usuários. Este documento detalha como
                  coletamos, armazenamos, utilizamos e protegemos suas
                  informações pessoais, em conformidade com a Lei Geral de
                  Proteção de Dados (Lei nº 13.709/2018).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Dados Coletados</h2>
                <p className="text-gray-700">
                  Os tipos de dados que coletamos incluem:
                </p>
                <ul className="list-disc pl-8 my-4 text-gray-700">
                  <li className="mb-2">
                    Informações pessoais: nome completo, e-mail, CPF, endereço
                    IP e informações financeiras para processamento de
                    pagamentos.
                  </li>
                  <li className="mb-2">
                    Dados de utilização e navegação: tipo de dispositivo
                    utilizado, endereço IP, cookies, páginas visitadas e
                    comportamento dentro da plataforma.
                  </li>
                </ul>
                <p className="text-gray-700">
                  Essas informações são coletadas mediante consentimento
                  explícito, com o objetivo de aprimorar e personalizar sua
                  experiência conosco.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Finalidade do Uso dos Dados
                </h2>
                <p className="text-gray-700">
                  Utilizamos suas informações pessoais para:
                </p>
                <ul className="list-disc pl-8 my-4 text-gray-700">
                  <li className="mb-2">
                    Efetivar cadastros e gerenciar acessos à plataforma.
                  </li>
                  <li className="mb-2">
                    Enviar atualizações, novidades e informações promocionais
                    sobre nossos serviços.
                  </li>
                  <li className="mb-2">
                    Realizar análises internas para melhorar continuamente
                    nossos serviços e a experiência do usuário.
                  </li>
                </ul>
                <p className="text-gray-700">
                  Todas as finalidades serão informadas de forma clara e direta
                  aos usuários.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Compartilhamento de Dados
                </h2>
                <p className="text-gray-700">
                  Suas informações poderão ser compartilhadas com parceiros
                  comerciais e fornecedores essenciais ao funcionamento da
                  plataforma, sempre respeitando os limites estabelecidos pela
                  LGPD e mantendo o compromisso de utilização somente para os
                  fins especificados.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Segurança das Informações
                </h2>
                <p className="text-gray-700">
                  Implementamos rigorosas medidas de segurança para proteger
                  seus dados pessoais, incluindo criptografia, antivírus,
                  antispam, firewalls e monitoramento constante. Os servidores
                  possuem acesso restrito, protegidos por VPN e realizamos
                  backups frequentes para garantir a integridade das
                  informações.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Direitos dos Usuários
                </h2>
                <p className="text-gray-700">
                  Você poderá acessar, corrigir, excluir ou solicitar restrições
                  ao tratamento dos seus dados pessoais a qualquer momento. Além
                  disso, você tem o direito de retirar seu consentimento
                  anterior entrando em contato diretamente conosco através de
                  nossos canais oficiais.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Uso de Cookies</h2>
                <p className="text-gray-700">
                  Utilizamos cookies para melhorar sua experiência em nosso site
                  e para realizar análises de desempenho interno. Caso prefira,
                  você pode desativar os cookies nas configurações do seu
                  navegador; porém, algumas funcionalidades podem ser
                  comprometidas.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Retenção de Dados
                </h2>
                <p className="text-gray-700">
                  Os dados pessoais serão armazenados apenas pelo tempo
                  necessário para cumprir as finalidades descritas neste
                  documento ou conforme exigido por lei. Após esse período, as
                  informações serão excluídas ou anonimizadas.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Jurisdição e Foro
                </h2>
                <p className="text-gray-700">
                  Qualquer conflito relacionado aos presentes termos será
                  resolvido no foro da comarca da sede da empresa, excluindo-se
                  qualquer outro.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Atualizações e Modificações
                </h2>
                <p className="text-gray-700">
                  Nos reservamos o direito de alterar esta política
                  periodicamente para refletir mudanças legislativas ou
                  internas. Informaremos aos usuários sobre qualquer alteração
                  significativa com antecedência adequada.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Contato</h2>
                <p className="text-gray-700">
                  Para esclarecimentos, dúvidas ou solicitações relacionadas à
                  privacidade e proteção de dados, entre em contato com nosso
                  encarregado pelo tratamento de dados através do e-mail:
                  suporte@tradershouse.com.br.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Termo de Reconhecimento e Aceitação de Compra
                </h2>
                <p className="text-gray-700 mb-3">
                  Ao realizar a compra, declaro para os devidos fins legais que
                  reconheço a legitimidade da transação efetuada junto à
                  empresa, confirmando que a aquisição ocorreu por decisão
                  própria, sem qualquer tipo de pressão ou indução fraudulenta.
                </p>
                <p className="text-gray-700 mb-3">
                  Declaro ainda não existir qualquer irregularidade que
                  justifique solicitação de estorno ou Chargeback da compra
                  efetuada.
                </p>
                <p className="text-gray-700 mb-3">
                  Reconheço expressamente que a empresa não praticou atos
                  fraudulentos ou ilícitos relacionados às transações em
                  questão, estando plenamente ciente e concordando com as
                  condições da compra.
                </p>
                <p className="text-gray-700 mb-3">
                  Assumo integral responsabilidade sobre a aquisição realizada e
                  renuncio explicitamente ao direito de solicitar Chargeback ou
                  reembolso posterior caso o serviço já tenha sido iniciado ou
                  utilizado.
                </p>
                <p className="text-gray-700 mb-3">
                  Autorizo, em caso de inadimplência, o registro de protesto até
                  a regularização da pendência financeira.
                </p>
                <p className="text-gray-700 mb-3">
                  Estou ciente de que, caso venha a solicitar Chargeback após
                  utilizar o serviço contratado, será registrado um Boletim de
                  Ocorrência, considerando que há registros e provas da
                  contratação e do uso efetivo do serviço adquirido, incluindo
                  mensagens trocadas e relatórios detalhados.
                </p>
                <p className="text-gray-700 mb-3">
                  Alertamos que tais práticas podem ser enquadradas como crime
                  de estelionato, conforme art. 171 do Código Penal, sendo todos
                  os documentos entregues às autoridades competentes para as
                  devidas providências legais.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Política de Reembolso
                </h2>
                <p className="text-gray-700">
                  Em conformidade com o Código de Defesa do Consumidor (CDC),
                  oferecemos o prazo legal de 7 (sete) dias para solicitação de
                  reembolso após a aquisição do serviço, desde que o serviço não
                  tenha sido iniciado ou utilizado. De acordo com o artigo 49 do
                  CDC, o direito ao arrependimento aplica-se exclusivamente a
                  serviços não utilizados ou não iniciados. Caso seja constatada
                  a utilização, interação ou início efetivo do produto digital
                  adquirido, fica descaracterizado o direito ao arrependimento,
                  não sendo devido o reembolso. Em casos de contestação, serão
                  disponibilizadas evidências documentais dessa interação,
                  amparando a negativa do pedido e o respaldo jurídico.
                </p>
              </section>
            </div>
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
}
