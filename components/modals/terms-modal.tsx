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
                Ao realizar a compra, declaro para os devidos fins legais que
                reconheço a legitimidade da transação efetuada junto à empresa,
                confirmando que a aquisição ocorreu por decisão própria, sem
                qualquer tipo de pressão ou indução fraudulenta.
              </p>
              <p className="mt-2 text-muted-foreground">
                Declaro ainda não existir qualquer irregularidade que justifique
                solicitação de estorno ou Chargeback da compra efetuada.
              </p>
              <p className="mt-2 text-muted-foreground">
                Reconheço expressamente que a empresa não praticou atos
                fraudulentos ou ilícitos relacionados às transações em questão,
                estando plenamente ciente e concordando com as condições da
                compra.
              </p>
              <p className="mt-2 text-muted-foreground">
                Assumo integral responsabilidade sobre a aquisição realizada e
                renuncio explicitamente ao direito de solicitar Chargeback ou
                reembolso posterior caso o serviço já tenha sido iniciado ou
                utilizado.
              </p>
              <p className="mt-2 text-muted-foreground">
                Autorizo, em caso de inadimplência, o registro de protesto até a
                regularização da pendência financeira.
              </p>
              <p className="mt-2 text-muted-foreground">
                Estou ciente de que, caso venha a solicitar Chargeback após
                utilizar o serviço contratado, será registrado um Boletim de
                Ocorrência, considerando que há registros e provas da
                contratação e do uso efetivo do serviço adquirido, incluindo
                mensagens trocadas e relatórios detalhados.
              </p>
              <p className="mt-2 text-muted-foreground">
                Alertamos que tais práticas podem ser enquadradas como crime de
                estelionato, conforme art. 171 do Código Penal, sendo todos os
                documentos entregues às autoridades competentes para as devidas
                providências legais.
              </p>
            </section>

            <section className="pt-3 border-t">
              <h3 className="font-semibold mb-2">Política de Reembolso</h3>
              <p className="text-muted-foreground">
                Em conformidade com o Código de Defesa do Consumidor (CDC),
                oferecemos o prazo legal de 7 (sete) dias para solicitação de
                reembolso após a aquisição do serviço, desde que o serviço não
                tenha sido iniciado ou utilizado. De acordo com o artigo 49 do
                CDC, o direito ao arrependimento aplica-se exclusivamente a
                serviços não utilizados ou não iniciados. Caso seja constatada a
                utilização, interação ou início efetivo do produto digital
                adquirido, fica descaracterizado o direito ao arrependimento,
                não sendo devido o reembolso. Em casos de contestação, serão
                disponibilizadas evidências documentais dessa interação,
                amparando a negativa do pedido e o respaldo jurídico.
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
