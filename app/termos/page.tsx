// app/termos/page.tsx

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
                  Ao concluir a compra, declaro que li, compreendi e aceitei as
                  condições comerciais apresentadas antes da contratação,
                  incluindo descrição do produto/serviço, preço, forma de
                  pagamento, prazo de acesso, regras de utilização, política de
                  reembolso e canais de atendimento.
                </p>
                <p className="text-gray-700 mb-3">
                  Declaro que a contratação foi realizada por minha livre
                  iniciativa, mediante o uso dos meus próprios dados cadastrais e
                  meio de pagamento autorizado, reconhecendo a legitimidade da
                  transação, salvo em caso de comprovação de fraude, erro,
                  cobrança indevida ou outro vício legalmente reconhecido.
                </p>
                <p className="text-gray-700 mb-3">
                  Estou ciente de que, por se tratar de produto/serviço digital,
                  a empresa poderá registrar evidências técnicas relacionadas à
                  contratação e à utilização do serviço, incluindo, quando
                  aplicável, data e hora de compra, dados cadastrais informados,
                  confirmação de pagamento, IP de acesso, login na plataforma,
                  ativação de conta, consumo de conteúdo, início de avaliação,
                  emissão de relatório, interações realizadas e demais registros
                  necessários à comprovação da entrega e utilização do serviço.
                </p>
                <p className="text-gray-700 mb-3">
                  Reconheço que a solicitação de reembolso, cancelamento ou
                  contestação de pagamento após o início efetivo da utilização
                  do serviço poderá ser analisada com base na política de
                  reembolso, nos registros de uso e na legislação aplicável, sem
                  prejuízo dos direitos assegurados ao consumidor em caso de
                  falha na prestação do serviço, vício, defeito, indisponibilidade
                  injustificada, cobrança indevida ou divergência relevante entre
                  a oferta e o serviço entregue.
                </p>
                <p className="text-gray-700 mb-3">
                  Em caso de contestação administrativa, chargeback ou
                  solicitação de estorno, autorizo que a empresa apresente às
                  instituições envolvidas na transação os documentos e registros
                  técnicos necessários à comprovação da contratação, autorização
                  de pagamento, entrega, acesso e utilização do serviço,
                  respeitada a legislação de proteção de dados aplicável.
                </p>
                <p className="text-gray-700 mb-3">
                  A utilização indevida dos mecanismos de contestação de
                  pagamento, mediante informações falsas, omissão relevante ou
                  tentativa de obtenção de vantagem indevida após a efetiva
                  contratação e utilização do serviço, poderá sujeitar o
                  responsável às medidas administrativas, extrajudiciais e
                  judiciais cabíveis, conforme a legislação aplicável.
                </p>
                <p className="text-gray-700 mb-3">
                  Este termo não limita, restringe ou exclui direitos legalmente
                  assegurados ao consumidor.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Política de Reembolso
                </h2>
                <p className="text-gray-700">
                  Nos termos do Código de Defesa do Consumidor, o cliente poderá
                  solicitar o cancelamento da compra no prazo de até 7 (sete)
                  dias corridos contados da contratação ou da disponibilização
                  do serviço, quando aplicável às contratações realizadas fora
                  do estabelecimento comercial.
                </p>
                <p className="text-gray-700 mt-4">
                  Por se tratar de produto/serviço digital com disponibilização
                  imediata de acesso, a solicitação de reembolso poderá ser
                  analisada considerando a efetiva utilização do serviço,
                  incluindo, mas não se limitando a: ativação de conta, acesso à
                  plataforma, consumo de conteúdo, início de avaliação, emissão
                  de relatório, uso de funcionalidades, interação com
                  ferramentas digitais ou qualquer outro registro técnico que
                  demonstre início efetivo da prestação.
                </p>
                <p className="text-gray-700 mt-4">
                  Caso seja constatado uso relevante ou consumo efetivo do
                  produto/serviço digital, a empresa poderá negar o reembolso,
                  desde que não haja falha na prestação do serviço,
                  indisponibilidade injustificada, vício, defeito ou divergência
                  relevante entre o serviço entregue e a oferta apresentada.
                </p>
                <p className="text-gray-700 mt-4">
                  Em caso de contestação, poderão ser utilizados registros
                  técnicos e documentais, como data e hora de acesso, logs de
                  utilização, IP, eventos de navegação, histórico de ativação,
                  consumo de conteúdo e demais evidências relacionadas à
                  prestação do serviço.
                </p>
                <p className="text-gray-700 mt-4">
                  Esta política não limita os direitos legais do consumidor em
                  caso de vício, defeito, cobrança indevida, indisponibilidade
                  do serviço ou descumprimento da oferta.
                </p>
              </section>
            </div>
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
}
