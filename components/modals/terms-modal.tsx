// components/modals/terms-modal.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TermsModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="h-auto p-0 text-primary underline font-normal"
        >
          Termos de Uso e Regulamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] block">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Termos e Condições de Uso e Política de Privacidade
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-4 h-[400px] pr-4 overflow-hidden">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">Introdução</h3>
              <p className="text-muted-foreground">
                Nosso compromisso é garantir a proteção e a privacidade dos
                dados pessoais de nossos usuários. Este documento detalha como
                coletamos, armazenamos, utilizamos e protegemos suas informações
                pessoais, em conformidade com a Lei Geral de Proteção de Dados
                (Lei nº 13.709/2018).
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Dados Coletados</h3>
              <p className="text-muted-foreground">
                Os tipos de dados que coletamos incluem:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li>
                  Informações pessoais: nome completo, e-mail, CPF, endereço IP
                  e informações financeiras para processamento de pagamentos.
                </li>
                <li>
                  Dados de utilização e navegação: tipo de dispositivo
                  utilizado, endereço IP, cookies, páginas visitadas e
                  comportamento dentro da plataforma.
                </li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                Essas informações são coletadas mediante consentimento
                explícito, com o objetivo de aprimorar e personalizar sua
                experiência conosco.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">
                Finalidade do Uso dos Dados
              </h3>
              <p className="text-muted-foreground">
                Utilizamos suas informações pessoais para:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li>Efetivar cadastros e gerenciar acessos à plataforma.</li>
                <li>
                  Enviar atualizações, novidades e informações promocionais
                  sobre nossos serviços.
                </li>
                <li>
                  Realizar análises internas para melhorar continuamente nossos
                  serviços e a experiência do usuário.
                </li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                Todas as finalidades serão informadas de forma clara e direta
                aos usuários.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Compartilhamento de Dados</h3>
              <p className="text-muted-foreground">
                Suas informações poderão ser compartilhadas com parceiros
                comerciais e fornecedores essenciais ao funcionamento da
                plataforma, sempre respeitando os limites estabelecidos pela
                LGPD e mantendo o compromisso de utilização somente para os fins
                especificados.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Segurança das Informações</h3>
              <p className="text-muted-foreground">
                Implementamos rigorosas medidas de segurança para proteger seus
                dados pessoais, incluindo criptografia, antivírus, antispam,
                firewalls e monitoramento constante. Os servidores possuem
                acesso restrito, protegidos por VPN e realizamos backups
                frequentes para garantir a integridade das informações.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Direitos dos Usuários</h3>
              <p className="text-muted-foreground">
                Você poderá acessar, corrigir, excluir ou solicitar restrições
                ao tratamento dos seus dados pessoais a qualquer momento. Além
                disso, você tem o direito de retirar seu consentimento anterior
                entrando em contato diretamente conosco através de nossos canais
                oficiais.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Uso de Cookies</h3>
              <p className="text-muted-foreground">
                Utilizamos cookies para melhorar sua experiência em nosso site e
                para realizar análises de desempenho interno. Caso prefira, você
                pode desativar os cookies nas configurações do seu navegador;
                porém, algumas funcionalidades podem ser comprometidas.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Retenção de Dados</h3>
              <p className="text-muted-foreground">
                Os dados pessoais serão armazenados apenas pelo tempo necessário
                para cumprir as finalidades descritas neste documento ou
                conforme exigido por lei. Após esse período, as informações
                serão excluídas ou anonimizadas.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Jurisdição e Foro</h3>
              <p className="text-muted-foreground">
                Qualquer conflito relacionado aos presentes termos será
                resolvido no foro da comarca da sede da empresa, excluindo-se
                qualquer outro.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">
                Atualizações e Modificações
              </h3>
              <p className="text-muted-foreground">
                Nos reservamos o direito de alterar esta política periodicamente
                para refletir mudanças legislativas ou internas. Informaremos
                aos usuários sobre qualquer alteração significativa com
                antecedência adequada.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Contato</h3>
              <p className="text-muted-foreground">
                Para esclarecimentos, dúvidas ou solicitações relacionadas à
                privacidade e proteção de dados, entre em contato com nosso
                encarregado pelo tratamento de dados através do e-mail:
                suporte@tradershouse.com.br.
              </p>
            </section>

            <section className="pt-3 border-t">
              <h3 className="font-semibold mb-2 text-base">
                Termo de Reconhecimento e Aceitação de Compra
              </h3>
              <p className="text-muted-foreground">
                Ao concluir a compra, declaro que li, compreendi e aceitei as
                condições comerciais apresentadas antes da contratação,
                incluindo descrição do produto/serviço, preço, forma de
                pagamento, prazo de acesso, regras de utilização, política de
                reembolso e canais de atendimento.
              </p>
              <p className="mt-2 text-muted-foreground">
                Declaro que a contratação foi realizada por minha livre
                iniciativa, mediante o uso dos meus próprios dados cadastrais e
                meio de pagamento autorizado, reconhecendo a legitimidade da
                transação, salvo em caso de comprovação de fraude, erro, cobrança
                indevida ou outro vício legalmente reconhecido.
              </p>
              <p className="mt-2 text-muted-foreground">
                Estou ciente de que, por se tratar de produto/serviço digital, a
                empresa poderá registrar evidências técnicas relacionadas à
                contratação e à utilização do serviço, incluindo, quando
                aplicável, data e hora de compra, dados cadastrais informados,
                confirmação de pagamento, IP de acesso, login na plataforma,
                ativação de conta, consumo de conteúdo, início de avaliação,
                emissão de relatório, interações realizadas e demais registros
                necessários à comprovação da entrega e utilização do serviço.
              </p>
              <p className="mt-2 text-muted-foreground">
                Reconheço que a solicitação de reembolso, cancelamento ou
                contestação de pagamento após o início efetivo da utilização do
                serviço poderá ser analisada com base na política de reembolso,
                nos registros de uso e na legislação aplicável, sem prejuízo dos
                direitos assegurados ao consumidor em caso de falha na prestação
                do serviço, vício, defeito, indisponibilidade injustificada,
                cobrança indevida ou divergência relevante entre a oferta e o
                serviço entregue.
              </p>
              <p className="mt-2 text-muted-foreground">
                Em caso de contestação administrativa, chargeback ou solicitação
                de estorno, autorizo que a empresa apresente às instituições
                envolvidas na transação os documentos e registros técnicos
                necessários à comprovação da contratação, autorização de
                pagamento, entrega, acesso e utilização do serviço, respeitada a
                legislação de proteção de dados aplicável.
              </p>
              <p className="mt-2 text-muted-foreground">
                A utilização indevida dos mecanismos de contestação de
                pagamento, mediante informações falsas, omissão relevante ou
                tentativa de obtenção de vantagem indevida após a efetiva
                contratação e utilização do serviço, poderá sujeitar o
                responsável às medidas administrativas, extrajudiciais e
                judiciais cabíveis, conforme a legislação aplicável.
              </p>
              <p className="mt-2 text-muted-foreground">
                Este termo não limita, restringe ou exclui direitos legalmente
                assegurados ao consumidor.
              </p>
            </section>

            <section className="pt-3 border-t">
              <h3 className="font-semibold mb-2">Política de Reembolso</h3>
              <p className="text-muted-foreground">
                Nos termos do Código de Defesa do Consumidor, o cliente poderá
                solicitar o cancelamento da compra no prazo de até 7 (sete) dias
                corridos contados da contratação ou da disponibilização do
                serviço, quando aplicável às contratações realizadas fora do
                estabelecimento comercial.
              </p>
              <p className="mt-2 text-muted-foreground">
                Por se tratar de produto/serviço digital com disponibilização
                imediata de acesso, a solicitação de reembolso poderá ser
                analisada considerando a efetiva utilização do serviço,
                incluindo, mas não se limitando a: ativação de conta, acesso à
                plataforma, consumo de conteúdo, início de avaliação, emissão de
                relatório, uso de funcionalidades, interação com ferramentas
                digitais ou qualquer outro registro técnico que demonstre início
                efetivo da prestação.
              </p>
              <p className="mt-2 text-muted-foreground">
                Caso seja constatado uso relevante ou consumo efetivo do
                produto/serviço digital, a empresa poderá negar o reembolso,
                desde que não haja falha na prestação do serviço,
                indisponibilidade injustificada, vício, defeito ou divergência
                relevante entre o serviço entregue e a oferta apresentada.
              </p>
              <p className="mt-2 text-muted-foreground">
                Em caso de contestação, poderão ser utilizados registros
                técnicos e documentais, como data e hora de acesso, logs de
                utilização, IP, eventos de navegação, histórico de ativação,
                consumo de conteúdo e demais evidências relacionadas à prestação
                do serviço.
              </p>
              <p className="mt-2 text-muted-foreground">
                Esta política não limita os direitos legais do consumidor em
                caso de vício, defeito, cobrança indevida, indisponibilidade do
                serviço ou descumprimento da oferta.
              </p>
            </section>
          </div>
        </ScrollArea>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
